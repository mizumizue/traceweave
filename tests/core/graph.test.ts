import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { DocNode } from '../../src/core/models/types.js';

/**
 * 【テスト概要】
 * - 対象: TraceGraph (トレーサビリティ有向グラフ)
 * - 条件: NEED -> REQ -> SPEC の依存連鎖と、SPECを検証するTCノードを有向グラフに追加
 * - 期待結果: 上流(upstream)・下流(downstream)ノードの双方向探索、および要件(REQ)に紐づく全テストケース(TC)の解決が正しく行われること
 * - 関連文書: TC-UT-0001, REQ-0001, SPEC-0002
 */
test('TC-UT-0001: TraceGraph - 有向グラフのノード登録と上流・下流（upstream/downstream）および要件紐づきTCの双方向トラバースができること', () => {
  const graph = new TraceGraph();

  const need: DocNode = {
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
  };

  const req: DocNode = {
    id: 'REQ-0001',
    kind: 'requirement',
    title: 'Req 1',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    criticality: 'high',
    depends_on: ['NEED-0001'],
    tags: [],
    links: [],
    content: '',
  };

  const spec: DocNode = {
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
  };

  const tc: DocNode = {
    id: 'TC-UT-0001',
    kind: 'test_case',
    title: 'Test 1',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'unit',
    test_method: 'unit_mock',
    depends_on: [],
    verifies: ['SPEC-0001'],
    tags: [],
    links: [],
    content: '',
  };

  graph.addNode(need);
  graph.addNode(req);
  graph.addNode(spec);
  graph.addNode(tc);

  assert.equal(graph.getNode('NEED-0001')?.title, 'Need 1');
  assert.equal(graph.getUpstream('REQ-0001')[0]?.id, 'NEED-0001');
  assert.equal(graph.getDownstream('NEED-0001')[0]?.id, 'REQ-0001');
  assert.equal(graph.getSpecsForRequirement('REQ-0001')[0]?.id, 'SPEC-0001');

  // REQ-0001 should find TC-UT-0001 via SPEC-0001
  const tcs = graph.getAllTestCasesForRequirement('REQ-0001');
  assert.equal(tcs.length, 1);
  assert.equal(tcs[0].id, 'TC-UT-0001');

  // No cycles
  assert.equal(graph.detectCycles().length, 0);
  // No orphans
  assert.equal(graph.detectOrphans().length, 0);
});

/**
 * 【テスト概要】
 * - 対象: TraceGraph (循環参照検知アルゴリズム)
 * - 条件: REQ-0001 -> SPEC-0001 -> DSN-0001 -> REQ-0001 の3ノード循環依存データを構築
 * - 期待結果: detectCycles() が1件の循環ループを検出し、循環を構成する3つのノードIDを正しく特定すること
 * - 関連文書: TC-UT-0001, REQ-0001, SPEC-0002
 */
test('TC-UT-0001: TraceGraph - 多段の依存関係ループ（循環参照）を検出し、循環パス配列を正確に特定できること', () => {
  const graph = new TraceGraph();

  const nodeA: DocNode = {
    id: 'REQ-0001',
    kind: 'requirement',
    title: 'A',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: ['SPEC-0001'], // Cycle: REQ-0001 -> SPEC-0001 -> DSN-0001 -> REQ-0001
    tags: [],
    links: [],
    content: '',
  };

  const nodeB: DocNode = {
    id: 'SPEC-0001',
    kind: 'specification',
    title: 'B',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: ['DSN-0001'],
    tags: [],
    links: [],
    content: '',
  };

  const nodeC: DocNode = {
    id: 'DSN-0001',
    kind: 'design',
    title: 'C',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: ['REQ-0001'],
    tags: [],
    links: [],
    content: '',
  };

  graph.addNode(nodeA);
  graph.addNode(nodeB);
  graph.addNode(nodeC);

  const cycles = graph.detectCycles();
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0].length, 3);
  assert.ok(cycles[0].includes('REQ-0001'));
  assert.ok(cycles[0].includes('SPEC-0001'));
  assert.ok(cycles[0].includes('DSN-0001'));
});

/**
 * 【テスト概要】
 * - 対象: TraceGraph (孤立ノードおよび未解決参照の検知)
 * - 条件: どこからも参照されず依存も持たない孤立ノード(REQ-9999)、および存在しないIDを参照するノード(SPEC-9999)を追加
 * - 期待結果: detectOrphans() で孤立ノードが検出され、detectMissingReferences() で欠落IDが正確に特定されること
 * - 関連文書: TC-UT-0001, REQ-0001, SPEC-0002
 */
test('TC-UT-0001: TraceGraph - 依存先を持たない孤立ノード（orphan）および未存在ノードを参照する欠落リンクを正しく検知できること', () => {
  const graph = new TraceGraph();

  const orphan: DocNode = {
    id: 'REQ-9999',
    kind: 'requirement',
    title: 'Lonely',
    status: 'draft',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };

  const broken: DocNode = {
    id: 'SPEC-9999',
    kind: 'specification',
    title: 'Broken',
    status: 'draft',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: ['DOES_NOT_EXIST'],
    tags: [],
    links: [],
    content: '',
  };

  graph.addNode(orphan);
  graph.addNode(broken);

  const orphans = graph.detectOrphans();
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].id, 'REQ-9999');

  const missing = graph.detectMissingReferences();
  assert.equal(missing.length, 1);
  assert.equal(missing[0].missingId, 'DOES_NOT_EXIST');
});

/**
 * 【テスト概要】
 * - 対象: TraceGraph (スタンドアロン仕様ノードの検出)
 * - 条件: REQに紐づく通常仕様と、上流REQを持たないスタンドアロン仕様（depends_on: []）を混在登録
 * - 期待結果: getStandaloneSpecifications により上流REQのない仕様のみが正確に抽出されること
 */
test('TraceGraph - 上流要件（REQ）を持たないスタンドアロン仕様ノードが正確に検出されること', () => {
  const graph = new TraceGraph();

  const req: DocNode = {
    id: 'REQ-0001',
    kind: 'requirement',
    title: 'Req 1',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };

  const normalSpec: DocNode = {
    id: 'SPEC-0001',
    kind: 'specification',
    title: 'Normal Spec',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: ['REQ-0001'],
    tags: [],
    links: [],
    content: '',
  };

  const standaloneSpec: DocNode = {
    id: 'SPEC-0002',
    kind: 'specification',
    title: 'Standalone Spec',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };

  graph.addNode(req);
  graph.addNode(normalSpec);
  graph.addNode(standaloneSpec);

  const standalones = graph.getStandaloneSpecifications();
  assert.equal(standalones.length, 1);
  assert.equal(standalones[0].id, 'SPEC-0002');
});

/**
 * 【テスト概要】
 * - 対象: TraceGraph (グラフ構築性能)
 * - 条件: NEED→REQ→SPEC→TC の鎖を 250 セット（計 1,000 ノード）で合成生成
 * - 期待結果: 構築と detectCycles() の合計が 50ms 以内で完了すること
 * - 関連文書: TC-UT-0010, SPEC-0002, QA-0001
 */
test('TC-UT-0010: TraceGraph - 1,000ノード規模のグラフ構築と循環検知が50ms以内に完了すること', () => {
  const graph = new TraceGraph();
  const baseDate = '2026-09-12';

  for (let i = 0; i < 250; i++) {
    const suffix = String(i).padStart(4, '0');
    const need: DocNode = {
      id: `NEED-P${suffix}`,
      kind: 'need',
      title: `Need ${i}`,
      status: 'accepted',
      created: baseDate,
      updated: baseDate,
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    };
    const req: DocNode = {
      id: `REQ-P${suffix}`,
      kind: 'requirement',
      title: `Req ${i}`,
      status: 'accepted',
      created: baseDate,
      updated: baseDate,
      scope: 'local',
      depends_on: [`NEED-P${suffix}`],
      tags: [],
      links: [],
      content: '',
    };
    const spec: DocNode = {
      id: `SPEC-P${suffix}`,
      kind: 'specification',
      title: `Spec ${i}`,
      status: 'accepted',
      created: baseDate,
      updated: baseDate,
      scope: 'local',
      depends_on: [`REQ-P${suffix}`],
      tags: [],
      links: [],
      content: '',
    };
    const tc: DocNode = {
      id: `TC-P${suffix}`,
      kind: 'test_case',
      title: `TC ${i}`,
      status: 'accepted',
      created: baseDate,
      updated: baseDate,
      scope: 'local',
      depends_on: [],
      verifies: [`SPEC-P${suffix}`],
      tags: [],
      links: [],
      content: '',
    };
    graph.addNode(need);
    graph.addNode(req);
    graph.addNode(spec);
    graph.addNode(tc);
  }

  const start = performance.now();
  const cycles = graph.detectCycles();
  const elapsed = performance.now() - start;

  assert.equal(cycles.length, 0);
  assert.ok(elapsed < 50, `expected graph build + cycle detection < 50ms, got ${elapsed.toFixed(2)}ms`);
});

