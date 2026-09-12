import test from 'node:test';
import assert from 'node:assert/strict';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { TraceabilityGraphBuilder } from '../../src/core/graph/TraceabilityGraphBuilder.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: TraceabilityGraphBuilder & TraceGraph（実ドキュメントのグラフレイアウト・トレースパス探索・種別除外・インスペクター連動）
 * - 条件: 実際の docs/ 配下の全ドキュメントから有向グラフおよびビジュアルグラフレイアウトを生成
 * - 期待結果: 階層ランク別ノード配置、祖先・子孫パスハイライト、種別除外フィルター、および選択ノードデータが正しく算出されること
 * - 関連文書: TC-0032, REQ-0020, REQ-0021, REQ-0022, SPEC-0018
 */
test('TC-0032: TraceabilityGraphBuilder - 階層レイアウト計算・上流下流パス探索および種別除外・詳細インスペクター連動の外部結合検証', () => {
  const parser = new DocParser();
  const nodes = parser.parseDirectory(repositoryPath('docs'));
  const graph = new TraceGraph();
  for (const n of nodes) {
    graph.addNode(n);
  }

  // 1. Build initial layout
  const result = TraceabilityGraphBuilder.buildGraph(nodes, { traceGraph: graph });
  assert.ok(result.nodes.length >= 90, 'All nodes should be laid out');
  assert.ok(result.edges.length > 50, 'Edges should be created');
  assert.ok(result.bounds.width > 0 && result.bounds.height > 0, 'Bounding box should be positive');

  // Verify ranks: Need(0), Actor/UC(1), Req(2), Spec/Design/ADR(3), QA/TC(4)
  const needNode = result.nodes.find(n => n.kind === 'need');
  assert.equal(needNode?.rank, 0);
  const reqNode = result.nodes.find(n => n.kind === 'requirement');
  assert.equal(reqNode?.rank, 2);
  const tcNode = result.nodes.find(n => n.kind === 'test_case');
  assert.equal(tcNode?.rank, 4);

  // 2. BFS Path Highlighting with selected node
  const targetReq = result.nodes.find(n => n.id === 'REQ-0001');
  assert.ok(targetReq, 'REQ-0001 must exist');

  const highlightedResult = TraceabilityGraphBuilder.buildGraph(nodes, {
    traceGraph: graph,
    selectedNodeId: 'REQ-0001',
    highlightMode: 'all',
  });

  const highlightedSelected = highlightedResult.nodes.find(n => n.id === 'REQ-0001');
  assert.equal(highlightedSelected?.isHighlighted, true);
  assert.equal(highlightedSelected?.isDimmed, false);

  // Verify at least one upstream (NEED-0001) is highlighted
  const upstreamNeed = highlightedResult.nodes.find(n => n.id === 'NEED-0001');
  assert.equal(upstreamNeed?.isHighlighted, true);

  const downstreamNode = graph.getDownstream('REQ-0001')[0];
  assert.ok(downstreamNode, 'REQ-0001 should have a downstream node');
  const downstreamResult = TraceabilityGraphBuilder.buildGraph(nodes, {
    traceGraph: graph,
    selectedNodeId: 'REQ-0001',
    highlightMode: 'downstream',
  });
  assert.equal(
    downstreamResult.nodes.find(n => n.id === downstreamNode.id)?.isHighlighted,
    true
  );
  assert.equal(
    downstreamResult.nodes.find(n => n.id === 'NEED-0001')?.isHighlighted,
    false
  );
  assert.ok(downstreamResult.edges.some(edge => edge.isHighlighted));

  const upstreamResult = TraceabilityGraphBuilder.buildGraph(nodes, {
    traceGraph: graph,
    selectedNodeId: 'REQ-0001',
    highlightMode: 'upstream',
  });
  assert.equal(upstreamResult.nodes.find(n => n.id === 'NEED-0001')?.isHighlighted, true);
  assert.equal(
    upstreamResult.nodes.find(n => n.id === downstreamNode.id)?.isHighlighted,
    false
  );
  assert.ok(upstreamResult.edges.some(edge => edge.isHighlighted));

  // Verify non-connected node is dimmed
  const dimmedNodes = highlightedResult.nodes.filter(n => n.isDimmed);
  assert.ok(dimmedNodes.length > 0, 'Non-connected nodes should be dimmed');

  // 3. Kind exclusion filter
  const excludedResult = TraceabilityGraphBuilder.buildGraph(nodes, {
    traceGraph: graph,
    excludedKinds: ['test_case'],
  });
  const hasTestCase = excludedResult.nodes.some(n => n.kind === 'test_case');
  assert.equal(hasTestCase, false, 'test_case nodes should be excluded');
  assert.ok(excludedResult.nodes.length < result.nodes.length);
  assert.ok(excludedResult.edges.length > 0);
  const visibleNodeIds = new Set(excludedResult.nodes.map(n => n.id));
  assert.ok(
    excludedResult.edges.every(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    'Excluded nodes must not leave dangling edges'
  );

  // 4. Verify the builder's public visual node contract for the detail inspector.
  const inspectorNode = result.nodes.find(n => n.id === 'REQ-0001');
  assert.ok(inspectorNode);
  assert.equal(inspectorNode.id, 'REQ-0001');
  assert.equal(inspectorNode.kind, 'requirement');
  assert.ok(inspectorNode.title.length > 0);
  assert.ok(Number.isFinite(inspectorNode.x));
  assert.ok(Number.isFinite(inspectorNode.y));
  assert.ok(inspectorNode.rank >= 0);
});
