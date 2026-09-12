import {
  DocKind,
  DocNode,
  TraceabilityGraphData,
  TraceGraphVisualNode,
  TraceGraphVisualEdge,
  TraceGraphBuildOptions,
  TraceGraphRankInfo,
  TraceEdgeType,
} from '../models/types.js';

export interface RankDefinition {
  rank: number;
  name: string;
  description: string;
  kinds: DocKind[];
}

export const GRAPH_RANKS: RankDefinition[] = [
  {
    rank: 0,
    name: '要求 (Needs)',
    description: 'ステークホルダー課題・目的',
    kinds: ['need'],
  },
  {
    rank: 1,
    name: 'アクター & UC',
    description: '外部アクターと利用シナリオ',
    kinds: ['actor', 'use_case'],
  },
  {
    rank: 2,
    name: '要件 (REQ)',
    description: '観測可能なシステム成果・振る舞い',
    kinds: ['requirement'],
  },
  {
    rank: 3,
    name: '仕様・設計・ADR',
    description: 'インターフェース契約・モジュール設計・意思決定',
    kinds: ['specification', 'design', 'decision'],
  },
  {
    rank: 4,
    name: '品質 & テスト',
    description: '検証戦略・テストケース・合否証跡',
    kinds: ['quality_assurance', 'test_case'],
  },
];

const KIND_TO_RANK = new Map<DocKind, number>();
for (const def of GRAPH_RANKS) {
  for (const kind of def.kinds) {
    KIND_TO_RANK.set(kind, def.rank);
  }
}

export class TraceabilityGraphBuilder {
  /**
   * Build complete visual traceability graph from raw DocNodes.
   */
  public static buildGraph(
    nodes: DocNode[],
    options: TraceGraphBuildOptions = {}
  ): TraceabilityGraphData {
    const nodeWidth = options.nodeWidth ?? 240;
    const nodeHeight = options.nodeHeight ?? 84;
    const xGap = options.xGap ?? 90;
    const yGap = options.yGap ?? 28;
    const marginX = 40;
    const marginY = 80;

    const allNodeMap = new Map<string, DocNode>();
    for (const node of nodes) {
      allNodeMap.set(node.id, node);
    }

    // 1. Build adjacency maps for upstreams and downstreams
    const upstreams = new Map<string, Set<string>>();
    const downstreams = new Map<string, Set<string>>();
    const rawEdges: { source: string; target: string; type: TraceEdgeType; label?: string }[] = [];
    const edgeDedup = new Set<string>();

    const addEdge = (source: string, target: string, type: TraceEdgeType, label?: string) => {
      if (source === target) return;
      if (!allNodeMap.has(source) || !allNodeMap.has(target)) return;

      const key = `${source}->${target}:${type}`;
      if (edgeDedup.has(key)) return;
      edgeDedup.add(key);

      rawEdges.push({ source, target, type, label });

      if (!upstreams.has(target)) upstreams.set(target, new Set());
      upstreams.get(target)!.add(source);

      if (!downstreams.has(source)) downstreams.set(source, new Set());
      downstreams.get(source)!.add(target);
    };

    for (const node of nodes) {
      if (!upstreams.has(node.id)) upstreams.set(node.id, new Set());
      if (!downstreams.has(node.id)) downstreams.set(node.id, new Set());

      // depends_on: source is dependency (upstream), target is node.id (downstream)
      for (const depId of node.depends_on || []) {
        addEdge(depId, node.id, 'depends_on', 'depends on');
      }

      // test_case verifies: target is verified target (upstream), test is downstream
      if (node.kind === 'test_case' && node.verifies) {
        for (const targetId of node.verifies) {
          addEdge(targetId, node.id, 'verifies', 'verifies');
        }
      }

      // use_case actor_refs & requirement_refs
      if (node.kind === 'use_case') {
        for (const act of node.actor_refs || []) {
          addEdge(act, node.id, 'actor_ref', 'actor');
        }
        for (const req of node.requirement_refs || []) {
          addEdge(node.id, req, 'requirement_ref', 'refines');
        }
      }

      // links: non-dependency cross references
      for (const linkId of node.links || []) {
        const targetNode = allNodeMap.get(linkId);
        if (targetNode) {
          const sRank = KIND_TO_RANK.get(node.kind) ?? 2;
          const tRank = KIND_TO_RANK.get(targetNode.kind) ?? 2;
          if (sRank <= tRank) {
            addEdge(node.id, linkId, 'link', 'links');
          } else {
            addEdge(linkId, node.id, 'link', 'links');
          }
        }
      }
    }

    // 2. Filter nodes by kind, excluded kinds, and search query
    const kindFilterSet = options.kindFilter
      ? new Set<DocKind>(Array.isArray(options.kindFilter) ? options.kindFilter : Array.from(options.kindFilter))
      : null;
    const excludedKindSet = options.excludedKinds
      ? new Set<DocKind>(Array.isArray(options.excludedKinds) ? options.excludedKinds : Array.from(options.excludedKinds))
      : null;

    const query = options.searchQuery?.trim().toLowerCase() || '';

    const visibleNodeIds = new Set<string>();
    for (const node of nodes) {
      if (excludedKindSet && excludedKindSet.has(node.kind)) {
        continue;
      }
      if (kindFilterSet && !kindFilterSet.has(node.kind)) {
        continue;
      }
      if (query) {
        const matchId = node.id.toLowerCase().includes(query);
        const matchTitle = node.title.toLowerCase().includes(query);
        const matchTags = (node.tags || []).some(t => t.toLowerCase().includes(query));
        if (!matchId && !matchTitle && !matchTags) {
          continue;
        }
      }
      visibleNodeIds.add(node.id);
    }

    // 3. Determine highlighting & dimming based on selectedNodeId
    const selectedId = options.selectedNodeId || null;
    const highlightMode = options.highlightMode || 'all';

    const highlightedNodeIds = new Set<string>();
    const highlightedEdgeKeys = new Set<string>();

    if (selectedId && allNodeMap.has(selectedId)) {
      highlightedNodeIds.add(selectedId);

      // Traversal: Upstream (ancestors)
      if (highlightMode === 'all' || highlightMode === 'upstream') {
        const q: string[] = [selectedId];
        const visited = new Set<string>([selectedId]);
        while (q.length > 0) {
          const curr = q.shift()!;
          const upList = upstreams.get(curr);
          if (upList) {
            for (const upId of upList) {
              highlightedNodeIds.add(upId);
              highlightedEdgeKeys.add(`${upId}->${curr}`);
              if (!visited.has(upId)) {
                visited.add(upId);
                q.push(upId);
              }
            }
          }
        }
      }

      // Traversal: Downstream (descendants)
      if (highlightMode === 'all' || highlightMode === 'downstream') {
        const q: string[] = [selectedId];
        const visited = new Set<string>([selectedId]);
        while (q.length > 0) {
          const curr = q.shift()!;
          const downList = downstreams.get(curr);
          if (downList) {
            for (const downId of downList) {
              highlightedNodeIds.add(downId);
              highlightedEdgeKeys.add(`${curr}->${downId}`);
              if (!visited.has(downId)) {
                visited.add(downId);
                q.push(downId);
              }
            }
          }
        }
      }
    }

    // 4. Group visible nodes by rank and sort within ranks
    const rankBuckets = new Map<number, DocNode[]>();
    for (let r = 0; r <= 4; r++) {
      rankBuckets.set(r, []);
    }

    for (const node of nodes) {
      if (!visibleNodeIds.has(node.id)) continue;
      const rank = KIND_TO_RANK.get(node.kind) ?? 2;
      rankBuckets.get(rank)?.push(node);
    }

    // Natural sort: kind precedence, then ID
    for (let r = 0; r <= 4; r++) {
      const bucket = rankBuckets.get(r)!;
      bucket.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind.localeCompare(b.kind);
        }
        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    // 5. Compute coordinates for each node
    const visualNodes: TraceGraphVisualNode[] = [];
    const rankInfoList: TraceGraphRankInfo[] = [];
    const rankCounts: Record<number, number> = {};

    let maxColumnY = marginY;

    for (const def of GRAPH_RANKS) {
      const bucket = rankBuckets.get(def.rank) || [];
      rankCounts[def.rank] = bucket.length;

      const colX = marginX + def.rank * (nodeWidth + xGap);

      rankInfoList.push({
        rank: def.rank,
        name: def.name,
        description: def.description,
        count: bucket.length,
        x: colX,
        y: 30,
      });

      bucket.forEach((node, index) => {
        const nodeY = marginY + index * (nodeHeight + yGap);
        if (nodeY + nodeHeight > maxColumnY) {
          maxColumnY = nodeY + nodeHeight;
        }

        const upList = Array.from(upstreams.get(node.id) || []);
        const downList = Array.from(downstreams.get(node.id) || []);

        const isHighlighted = highlightedNodeIds.has(node.id);
        const isDimmed = selectedId !== null && !isHighlighted;

        visualNodes.push({
          id: node.id,
          kind: node.kind,
          title: node.title,
          status: node.status,
          criticality: node.criticality,
          test_level: node.test_level,
          test_method: node.test_method,
          x: colX,
          y: nodeY,
          width: nodeWidth,
          height: nodeHeight,
          rank: def.rank,
          rankName: def.name,
          isHighlighted,
          isDimmed,
          upstreamCount: upList.length,
          downstreamCount: downList.length,
          upstreamIds: upList,
          downstreamIds: downList,
        });
      });
    }

    // 6. Build visible edges
    const visualEdges: TraceGraphVisualEdge[] = [];
    const visualNodeMap = new Map<string, TraceGraphVisualNode>();
    for (const vn of visualNodes) {
      visualNodeMap.set(vn.id, vn);
    }

    for (const edge of rawEdges) {
      if (!visualNodeMap.has(edge.source) || !visualNodeMap.has(edge.target)) {
        continue;
      }

      const isPathHighlighted =
        highlightedEdgeKeys.has(`${edge.source}->${edge.target}`) ||
        (highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target));

      const isDimmed = selectedId !== null && !isPathHighlighted;

      visualEdges.push({
        id: `${edge.source}->${edge.target}:${edge.type}`,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
        isHighlighted: isPathHighlighted,
        isDimmed,
      });
    }

    // 7. Calculate overall graph bounds
    const totalColumns = GRAPH_RANKS.length;
    const maxX = marginX + totalColumns * (nodeWidth + xGap);
    const maxY = Math.max(maxColumnY + marginY, 600);

    const bounds = {
      minX: 0,
      minY: 0,
      maxX,
      maxY,
      width: maxX,
      height: maxY,
    };

    const stats = {
      totalNodes: nodes.length,
      visibleNodes: visualNodes.length,
      totalEdges: rawEdges.length,
      visibleEdges: visualEdges.length,
      rankCounts,
    };

    return {
      nodes: visualNodes,
      edges: visualEdges,
      bounds,
      stats,
      ranks: rankInfoList,
    };
  }
}
