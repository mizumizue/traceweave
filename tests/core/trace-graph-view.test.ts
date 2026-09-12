import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { TraceabilityGraphBuilder, GRAPH_RANKS } from '../../src/core/graph/TraceabilityGraphBuilder.js';
import { DocNode } from '../../src/core/models/types.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: TraceabilityGraphBuilder (グラフレイアウト・座標計算)
 * - 条件: 全種別(NEED, ACT, UC, REQ, SPEC, DSN, ADR, QA, TC)のノードと依存関係を渡して buildGraph を実行
 * - 期待結果: 各ノードに適切な rank (0〜4) と有効なXY座標・寸法が算出され、有向エッジが正しく接続されること
 * - 関連文書: TC-0018, REQ-0020, REQ-0021, SPEC-0018
 */
test('TC-0018: TraceabilityGraphBuilder - 全種別ノードの階層ランク付け・XY座標算出およびエッジ構築が正しく行われること', () => {
  const nodes: DocNode[] = [
    {
      id: 'NEED-0001',
      kind: 'need',
      title: 'Need 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      tags: ['core'],
      links: [],
      content: '',
    },
    {
      id: 'ACT-0001',
      kind: 'actor',
      title: 'Actor 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'UC-0001',
      kind: 'use_case',
      title: 'Use Case 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      actor_refs: ['ACT-0001'],
      requirement_refs: ['REQ-0001'],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'REQ-0001',
      kind: 'requirement',
      title: 'Requirement 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      criticality: 'high',
      depends_on: ['NEED-0001'],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'SPEC-0001',
      kind: 'specification',
      title: 'Specification 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['REQ-0001'],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'DSN-0001',
      kind: 'design',
      title: 'Design 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['SPEC-0001'],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'TC-0001',
      kind: 'test_case',
      title: 'Test Case 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      test_level: 'unit',
      test_method: 'unit_mock',
      verifies: ['SPEC-0001'],
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
  ];

  const graphData = TraceabilityGraphBuilder.buildGraph(nodes);

  assert.equal(graphData.nodes.length, 7);
  assert.ok(graphData.edges.length >= 6);
  assert.equal(graphData.ranks.length, 5);

  const needVNode = graphData.nodes.find(n => n.id === 'NEED-0001')!;
  assert.equal(needVNode.rank, 0);
  assert.equal(needVNode.upstreamCount, 0);
  assert.ok(needVNode.downstreamCount >= 1);

  const reqVNode = graphData.nodes.find(n => n.id === 'REQ-0001')!;
  assert.equal(reqVNode.rank, 2);
  assert.ok(reqVNode.upstreamIds.includes('NEED-0001'));

  const specVNode = graphData.nodes.find(n => n.id === 'SPEC-0001')!;
  assert.equal(specVNode.rank, 3);
  assert.ok(specVNode.downstreamIds.includes('DSN-0001'));
  assert.ok(specVNode.downstreamIds.includes('TC-0001'));

  const tcVNode = graphData.nodes.find(n => n.id === 'TC-0001')!;
  assert.equal(tcVNode.rank, 4);
  assert.ok(tcVNode.upstreamIds.includes('SPEC-0001'));

  // Coordinate validity
  for (const vNode of graphData.nodes) {
    assert.ok(!Number.isNaN(vNode.x), `x must be a number for ${vNode.id}`);
    assert.ok(!Number.isNaN(vNode.y), `y must be a number for ${vNode.id}`);
    assert.ok(vNode.width > 0);
    assert.ok(vNode.height > 0);
  }

  // Bounds
  assert.ok(graphData.bounds.width > 0);
  assert.ok(graphData.bounds.height > 0);
  assert.ok(graphData.bounds.maxX >= graphData.bounds.minX);
  assert.ok(graphData.bounds.maxY >= graphData.bounds.minY);
});

/**
 * 【テスト概要】
 * - 対象: TraceabilityGraphBuilder (上流・下流ハイライト探索)
 * - 条件: NEED -> REQ -> SPEC -> TC の連鎖データにおいて SPEC ノードを選択し、ハイライトモード(all/upstream/downstream)を指定
 * - 期待結果: 指定方向のノードのみが isHighlighted: true となり、無関係なノードが isDimmed: true となること
 * - 関連文書: TC-0018, REQ-0021, SPEC-0018
 */
test('TC-0018: TraceabilityGraphBuilder - 選択ノードに基づく上流・下流ハイライト探索および非関連ノードの減衰処理が正しく動作すること', () => {
  const nodes: DocNode[] = [
    {
      id: 'NEED-0001',
      kind: 'need',
      title: 'Need 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'REQ-0001',
      kind: 'requirement',
      title: 'Req 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['NEED-0001'],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'SPEC-0001',
      kind: 'specification',
      title: 'Spec 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['REQ-0001'],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'TC-0001',
      kind: 'test_case',
      title: 'TC 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      verifies: ['SPEC-0001'],
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'REQ-0002',
      kind: 'requirement',
      title: 'Unrelated Req',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
  ];

  // 1. Highlight all (upstream + downstream) for SPEC-0001
  const allHighlighted = TraceabilityGraphBuilder.buildGraph(nodes, {
    selectedNodeId: 'SPEC-0001',
    highlightMode: 'all',
  });

  const specNode = allHighlighted.nodes.find(n => n.id === 'SPEC-0001')!;
  const reqNode = allHighlighted.nodes.find(n => n.id === 'REQ-0001')!;
  const needNode = allHighlighted.nodes.find(n => n.id === 'NEED-0001')!;
  const tcNode = allHighlighted.nodes.find(n => n.id === 'TC-0001')!;
  const unrelatedNode = allHighlighted.nodes.find(n => n.id === 'REQ-0002')!;

  assert.equal(specNode.isHighlighted, true);
  assert.equal(reqNode.isHighlighted, true);
  assert.equal(needNode.isHighlighted, true);
  assert.equal(tcNode.isHighlighted, true);
  assert.equal(unrelatedNode.isHighlighted, false);
  assert.equal(unrelatedNode.isDimmed, true);

  // 2. Upstream only for SPEC-0001
  const upHighlighted = TraceabilityGraphBuilder.buildGraph(nodes, {
    selectedNodeId: 'SPEC-0001',
    highlightMode: 'upstream',
  });
  const upTc = upHighlighted.nodes.find(n => n.id === 'TC-0001')!;
  const upReq = upHighlighted.nodes.find(n => n.id === 'REQ-0001')!;
  assert.equal(upReq.isHighlighted, true);
  assert.equal(upTc.isHighlighted, false);
  assert.equal(upTc.isDimmed, true);

  // 3. Downstream only for SPEC-0001
  const downHighlighted = TraceabilityGraphBuilder.buildGraph(nodes, {
    selectedNodeId: 'SPEC-0001',
    highlightMode: 'downstream',
  });
  const downTc = downHighlighted.nodes.find(n => n.id === 'TC-0001')!;
  const downReq = downHighlighted.nodes.find(n => n.id === 'REQ-0001')!;
  assert.equal(downTc.isHighlighted, true);
  assert.equal(downReq.isHighlighted, false);
  assert.equal(downReq.isDimmed, true);
});

/**
 * 【テスト概要】
 * - 対象: TraceabilityGraphBuilder (循環参照安全性および種別フィルター)
 * - 条件: 循環参照(REQ-1 <-> REQ-2)を持つノード群のグラフ構築、および存在しない種別での絞り込み
 * - 期待結果: 無限ループに陥らず安全に完了し、種別フィルターにより合致しないノード・エッジが正しく除外されること
 * - 関連文書: TC-0018, REQ-0021, SPEC-0018
 */
test('TC-0018: TraceabilityGraphBuilder - 循環参照を含むグラフの安全な探索完了および種別フィルターによる絞り込みが機能すること', () => {
  // Test cycles safety
  const cyclicNodes: DocNode[] = [
    {
      id: 'REQ-0001',
      kind: 'requirement',
      title: 'Req 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['REQ-0002'],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'REQ-0002',
      kind: 'requirement',
      title: 'Req 2',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['REQ-0001'],
      tags: [],
      links: [],
      content: '',
    },
  ];

  // Must not hang or throw
  const cyclicResult = TraceabilityGraphBuilder.buildGraph(cyclicNodes, {
    selectedNodeId: 'REQ-0001',
  });
  assert.equal(cyclicResult.nodes.length, 2);

  // Test kind filtering
  const filtered = TraceabilityGraphBuilder.buildGraph(cyclicNodes, {
    kindFilter: ['need'], // none match
  });
  assert.equal(filtered.nodes.length, 0);
  assert.equal(filtered.edges.length, 0);

  // Test excludedKinds filtering (原則All表示から特定種別のみ非表示除外)
  const fullNodes: DocNode[] = [
    {
      id: 'NEED-0001',
      kind: 'need',
      title: 'Need 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'REQ-0001',
      kind: 'requirement',
      title: 'Req 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['NEED-0001'],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'TC-0001',
      kind: 'test_case',
      title: 'TC 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      verifies: ['REQ-0001'],
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
  ];

  // Default: all 3 nodes visible
  const defaultGraph = TraceabilityGraphBuilder.buildGraph(fullNodes);
  assert.equal(defaultGraph.nodes.length, 3);
  assert.equal(defaultGraph.edges.length, 2);

  // Exclude test_case: only TC-0001 is hidden, NEED-0001 and REQ-0001 remain
  const tcExcluded = TraceabilityGraphBuilder.buildGraph(fullNodes, {
    excludedKinds: ['test_case'],
  });
  assert.equal(tcExcluded.nodes.length, 2);
  assert.ok(tcExcluded.nodes.some(n => n.id === 'NEED-0001'));
  assert.ok(tcExcluded.nodes.some(n => n.id === 'REQ-0001'));
  assert.ok(!tcExcluded.nodes.some(n => n.id === 'TC-0001'));
  // Edges connecting to TC-0001 should also be excluded
  assert.equal(tcExcluded.edges.length, 1);
  assert.equal(tcExcluded.edges[0].source, 'NEED-0001');
  assert.equal(tcExcluded.edges[0].target, 'REQ-0001');

  // Exclude multiple kinds (Set input)
  const multiExcluded = TraceabilityGraphBuilder.buildGraph(fullNodes, {
    excludedKinds: new Set(['need', 'test_case']),
  });
  assert.equal(multiExcluded.nodes.length, 1);
  assert.equal(multiExcluded.nodes[0].id, 'REQ-0001');
  assert.equal(multiExcluded.edges.length, 0);
});

/**
 * 【テスト概要】
 * - 対象: TraceabilityGraphBuilder & DocParser 結合テスト
 * - 条件: 実際のリポジトリ内 docs/ ディレクトリの全ノードを読み込み、トレーサビリティグラフを構築
 * - 期待結果: 80件以上のノードおよび50本以上のエッジが生成され、全階層ランク(0〜4)にノードが存在すること
 * - 関連文書: TC-0018, REQ-0020, REQ-0021, REQ-0022
 */
test('TC-0018: TraceabilityGraphBuilder - 実際のdocsディレクトリを対象とした全階層レイアウトおよびエッジ接続の結合検証', () => {
  const parser = new DocParser();
  const nodes = parser.parseDirectory(repositoryPath('docs'));
  assert.ok(nodes.length >= 80);

  const graph = TraceabilityGraphBuilder.buildGraph(nodes);

  assert.equal(graph.nodes.length, nodes.length);
  assert.ok(graph.edges.length > 50);
  assert.ok(graph.bounds.width > 1000);
  assert.ok(graph.bounds.height > 500);

  // Check all 5 ranks have at least one node in real repository
  for (let r = 0; r <= 4; r++) {
    const nodesInRank = graph.nodes.filter(n => n.rank === r);
    assert.ok(nodesInRank.length > 0, `Rank ${r} should have nodes`);
  }
});
