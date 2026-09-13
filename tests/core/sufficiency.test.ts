import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { SufficiencyScorer } from '../../src/core/sufficiency/SufficiencyScorer.js';
import { MatrixBuilder } from '../../src/core/matrix/MatrixBuilder.js';
import { DocNode } from '../../src/core/models/types.js';

/**
 * 【テスト概要】
 * - 対象: SufficiencyScorer (要件充足度スコア計算)
 * - 条件: 関連するテストケース(TC)が一切紐づいていない高重要度(high)要件を渡してスコア計算を実行
 * - 期待結果: 充足度スコアが 0%、isFullySatisfied が false、missingPhases に unit や integration_internal が含まれること
 * - 関連文書: TC-0002, REQ-0002, SPEC-0003
 */
test('TC-0002: SufficiencyScorer - テストが紐づかない未検証要件に対してスコア0%および未実施フェーズが返されること', () => {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();

  const req: DocNode = {
    id: 'REQ-0001',
    kind: 'requirement',
    title: 'Untested',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    criticality: 'high',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };
  graph.addNode(req);

  const res = scorer.calculateRequirement(graph, req);
  assert.equal(res.score, 0);
  assert.equal(res.isFullySatisfied, false);
  assert.ok(res.missingPhases.includes('unit'));
  assert.ok(res.missingPhases.includes('integration_internal'));
});

/**
 * 【テスト概要】
 * - 対象: SufficiencyScorer (高重要度要件の多層テスト充足度計算)
 * - 条件: 高重要度(high)要件に対し、単体(UT)のみ紐づけた状態から結合(ITa, ITb)・受入(UAT)テストを順次追加
 * - 期待結果: UTのみで30点、全層揃うことで100点(isFullySatisfied: true, missingPhases: 0件)へと段階的に加算されること
 * - 関連文書: TC-0002, REQ-0002, SPEC-0003
 */
test('TC-0002: SufficiencyScorer - 高重要度（high）要件において各テスト層の追加に応じた段階的スコアリングと100%充足判定が行われること', () => {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();

  const req: DocNode = {
    id: 'REQ-0001',
    kind: 'requirement',
    title: 'High Criticality',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    criticality: 'high',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };
  graph.addNode(req);

  const tcUnit: DocNode = {
    id: 'TC-0001',
    kind: 'test_case',
    title: 'UT',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'unit',
    test_method: 'unit_mock',
    depends_on: [],
    verifies: ['REQ-0001'],
    tags: [],
    links: [],
    content: '',
  };
  graph.addNode(tcUnit);

  // With unit only: 30 pts
  let res = scorer.calculateRequirement(graph, req);
  assert.equal(res.score, 30);
  assert.equal(res.isFullySatisfied, false);

  // Add integration_internal (+25), integration_external (+25), acceptance (+20)
  const tcInt: DocNode = {
    id: 'TC-0002',
    kind: 'test_case',
    title: 'ITa',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'integration_internal',
    test_method: 'api_contract',
    depends_on: [],
    verifies: ['REQ-0001'],
    tags: [],
    links: [],
    content: '',
  };
  const tcExt: DocNode = {
    id: 'TC-0003',
    kind: 'test_case',
    title: 'ITb',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'integration_external',
    test_method: 'api_contract',
    depends_on: [],
    verifies: ['REQ-0001'],
    tags: [],
    links: [],
    content: '',
  };
  const tcUat: DocNode = {
    id: 'TC-0004',
    kind: 'test_case',
    title: 'UAT',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'acceptance',
    test_method: 'exploratory_manual',
    depends_on: [],
    verifies: ['REQ-0001'],
    tags: [],
    links: [],
    content: '',
  };

  graph.addNode(tcInt);
  graph.addNode(tcExt);
  graph.addNode(tcUat);

  res = scorer.calculateRequirement(graph, req);
  assert.equal(res.score, 100);
  assert.equal(res.isFullySatisfied, true);
  assert.equal(res.missingPhases.length, 0);
});

/**
 * 【テスト概要】
 * - 対象: SufficiencyScorer (中重要度要件のスコア計算)
 * - 条件: 単体テスト(UT)のみが紐づいた中重要度(medium)要件を計算
 * - 期待結果: 中重要度は50%と判定されること
 * - 関連文書: TC-0002, REQ-0002, SPEC-0003
 */
test('TC-0002: SufficiencyScorer - 中重要度（medium）要件に対して重要度別の重み付けルールが正しく適用されること', () => {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();

  const reqMed: DocNode = {
    id: 'REQ-0002',
    kind: 'requirement',
    title: 'Medium',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    criticality: 'medium',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };
  graph.addNode(reqMed);

  const tcUnit: DocNode = {
    id: 'TC-0010',
    kind: 'test_case',
    title: 'UT',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'unit',
    test_method: 'unit_mock',
    depends_on: [],
    verifies: ['REQ-0002'],
    tags: [],
    links: [],
    content: '',
  };
  graph.addNode(tcUnit);

  // Medium with unit only is 50%
  const resMed = scorer.calculateRequirement(graph, reqMed);
  assert.equal(resMed.score, 50);

});

/**
 * 【テスト概要】
 * - 対象: SufficiencyScorer (スタンドアロン仕様の充足度スコア計算)
 * - 条件: 上流要件を持たないスタンドアロン仕様（SPEC-0002）に対してUT/ITaテストケースを紐づけてcalculateAllを実行
 * - 期待結果: スタンドアロン仕様が充足度集計結果に含まれ、紐づくテストレベルに応じたスコアが正しく計算されること
 */
test('SufficiencyScorer - 上流要件を持たないスタンドアロン仕様に対しても直接紐づくテストから充足度スコアが計算されること', () => {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();

  const spec: DocNode = {
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

  const tc1: DocNode = {
    id: 'TC-0001',
    kind: 'test_case',
    title: 'Unit Test for Spec',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'unit',
    test_method: 'unit_contract',
    verifies: ['SPEC-0002'],
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };

  const tc2: DocNode = {
    id: 'TC-0002',
    kind: 'test_case',
    title: 'Integration Test for Spec',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'integration_internal',
    test_method: 'unit_contract',
    verifies: ['SPEC-0002'],
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };

  graph.addNode(spec);
  graph.addNode(tc1);
  graph.addNode(tc2);

  const sufficiencies = scorer.calculateAll(graph);
  assert.equal(sufficiencies.length, 1);
  assert.equal(sufficiencies[0].requirementId, 'SPEC-0002');
  assert.equal(sufficiencies[0].phaseCounts.unit, 1);
  assert.equal(sufficiencies[0].phaseCounts.integration_internal, 1);
  assert.ok(sufficiencies[0].score > 0);
});

/**
 * 【テスト概要】
 * - 対象: MatrixBuilder (スタンドアロン仕様のマトリクス行生成)
 * - 条件: 上流要件を持たないスタンドアロン仕様（SPEC-0002）とそのテストケースが存在するグラフを構築
 * - 期待結果: buildMatrix により生成されるマトリクスに行が追加され、requirementId に仕様IDが設定されること
 */
test('MatrixBuilder - 上流要件を持たないスタンドアロン仕様がマトリクス行として生成されること', () => {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();
  const builder = new MatrixBuilder();

  const spec: DocNode = {
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

  const tc: DocNode = {
    id: 'TC-0001',
    kind: 'test_case',
    title: 'Unit Test for Spec',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'unit',
    test_method: 'unit_contract',
    verifies: ['SPEC-0002'],
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };

  graph.addNode(spec);
  graph.addNode(tc);

  const sufficiencies = scorer.calculateAll(graph);
  const matrix = builder.buildMatrix(graph, sufficiencies);

  assert.equal(matrix.length, 1);
  assert.equal(matrix[0].requirementId, 'SPEC-0002');
  assert.equal(matrix[0].requirementTitle, 'Standalone Spec');
  assert.equal(matrix[0].specs.length, 1);
  assert.equal(matrix[0].specs[0].id, 'SPEC-0002');
  assert.equal(matrix[0].allTestCases.length, 1);
  assert.equal(matrix[0].allTestCases[0].id, 'TC-0001');
});


