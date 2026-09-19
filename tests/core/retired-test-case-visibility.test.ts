import assert from 'node:assert/strict';
import test from 'node:test';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { buildTestStratumCatalog } from '../../src/core/testing/buildTestStratumCatalog.js';
import { DocNode } from '../../src/core/models/types.js';

/**
 * 【テスト概要】
 * - 対象: TraceGraph / buildTestStratumCatalog（ADR-0010 退役分割親の除外）
 * - 条件: deprecated 親と active 子を同一グラフに登録
 * - 期待結果: 親は verifies エッジ・カタログ・直接 TC 一覧に含まれないこと
 */
test('退役分割親 TC はトレーサビリティとテストブック一覧から除外されること', () => {
  const parent: DocNode = {
    id: 'TC-ITb-0099',
    kind: 'test_case',
    title: 'retired parent',
    status: 'deprecated',
    test_level: 'integration_external',
    test_method: 'api_contract',
    verifies: ['REQ-0001'],
    supersedes: ['TC-ITb-0099-01'],
    depends_on: [],
    tags: [],
    links: [],
    created: '2026-09-19',
    updated: '2026-09-19',
    scope: 'local',
  };
  const child: DocNode = {
    id: 'TC-ITb-0099-01',
    kind: 'test_case',
    title: 'active child',
    status: 'accepted',
    test_level: 'integration_external',
    test_method: 'api_contract',
    verifies: ['REQ-0001'],
    derived_from: 'TC-ITb-0099',
    depends_on: [],
    tags: [],
    links: [],
    created: '2026-09-19',
    updated: '2026-09-19',
    scope: 'local',
  };

  const graph = new TraceGraph();
  graph.addNode(parent);
  graph.addNode(child);

  const direct = graph.getDirectTestCases('REQ-0001').map(tc => tc.id);
  assert.deepEqual(direct, ['TC-ITb-0099-01']);

  const catalog = buildTestStratumCatalog([parent, child]);
  assert.equal(catalog.totalCases, 1);
  assert.ok(catalog.chapters.some(ch => ch.cases.some(c => c.id === 'TC-ITb-0099-01')));
  assert.ok(!catalog.chapters.some(ch => ch.cases.some(c => c.id === 'TC-ITb-0099')));
});
