import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../../src/application/build-report.js';
import { repositoryPath } from '../../helpers/repo-path.js';
import { TraceabilityGraphBuilder } from '../../../src/core/graph/TraceabilityGraphBuilder.js';

/**
 * 【テスト概要】
 * - 対象: TraceabilityGraphBuilder のレイアウト契約およびドキュメント依存グラフ
 * - 条件: 実ドキュメントから描画データを構築し、選択ノードのハイライトを検査
 * - 期待結果: 描画ノードとハイライト状態が契約どおり生成され、NEED-0007からTC-ITb-0014までのトレーサビリティが結合されていること
 * - 関連文書: TC-ITb-0014, REQ-0020, REQ-0021, REQ-0022, SPEC-0018
 */
test('support: ITb-0014: トレーサビリティグラフ - レイアウトと選択ノードのハイライト契約検証', () => {
  const { graph, nodes } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const graphData = TraceabilityGraphBuilder.buildGraph(nodes, { selectedNodeId: 'REQ-0020' });
  assert.ok(graphData.nodes.length > 0);
  assert.ok(graphData.nodes.some(node => node.isHighlighted));
  assert.ok(graphData.nodes.some(node => node.isDimmed));

  const need0007 = graph.getNode('NEED-0007');
  assert.ok(need0007, 'NEED-0007 must exist in the graph');
  assert.equal(need0007?.kind, 'need');

  const req0020 = graph.getNode('REQ-0020');
  assert.ok(req0020, 'REQ-0020 must exist');
  assert.ok(req0020?.depends_on.includes('NEED-0007'));

  const req0021 = graph.getNode('REQ-0021');
  assert.ok(req0021, 'REQ-0021 must exist');
  assert.ok(req0021?.depends_on.includes('NEED-0007'));

  const req0022 = graph.getNode('REQ-0022');
  assert.ok(req0022, 'REQ-0022 must exist');
  assert.ok(req0022?.depends_on.includes('NEED-0007'));

  const spec0018 = graph.getNode('SPEC-0018');
  assert.ok(spec0018, 'SPEC-0018 must exist');
  assert.ok(spec0018?.depends_on.includes('REQ-0020'));
  assert.ok(spec0018?.depends_on.includes('REQ-0021'));
  assert.ok(spec0018?.depends_on.includes('REQ-0022'));

  const tc0018 = graph.getNode('TC-ITb-0014');
  assert.ok(tc0018, 'TC-ITb-0014 must exist');
  assert.ok(tc0018?.verifies?.includes('REQ-0020'));
  assert.ok(tc0018?.verifies?.includes('SPEC-0018'));
});
