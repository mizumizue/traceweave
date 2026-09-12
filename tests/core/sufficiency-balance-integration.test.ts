import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { SufficiencyScorer } from '../../src/core/sufficiency/SufficiencyScorer.js';
import { BalanceAnalyzer } from '../../src/core/analyzer/BalanceAnalyzer.js';
import { DocNode } from '../../src/core/models/types.js';

/**
 * 【テスト概要】
 * - 対象: SufficiencyScorer, BalanceAnalyzer, TraceGraph（有向グラフと品質充足度・ピラミッド地層分析の内部結合）
 * - 条件: High/Medium/Low要件と複数工程（unit, integration_internal, system, acceptance）のTCを含むグラフを構築して結合解析を実行
 * - 期待結果: 要件ごとの重要度別スコアリング、全工程地層密度判定、ピラミッドアンチパターン診断が一貫した品質レポートとして算出されること
 * - 関連文書: TC-0025, REQ-0002, REQ-0003, SPEC-0003
 */
test('TC-0025: SufficiencyScorer & BalanceAnalyzer - 有向グラフからの重要度別スコアリングと工程地層密度・ピラミッド診断の内部結合検証', () => {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();
  const analyzer = new BalanceAnalyzer();

  // 1. Build test graph with requirements and test cases
  const nodes: DocNode[] = [
    // High requirement with full coverage
    { id: 'REQ-H1', kind: 'requirement', title: '高重要度要件（完備）', criticality: 'high', depends_on: [] },
    { id: 'SPEC-H1', kind: 'specification', title: '高重要度仕様', depends_on: ['REQ-H1'] },
    { id: 'TC-H1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-IT', kind: 'test_case', title: 'ITa', test_level: 'integration_internal', test_method: 'scenario', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-ST', kind: 'test_case', title: 'ST', test_level: 'system', test_method: 'scenario', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-UAT', kind: 'test_case', title: 'UAT', test_level: 'acceptance', test_method: 'exploratory_manual', verifies: ['SPEC-H1'], depends_on: [] },

    // High requirement with only UT and ITa (missing ST/ITb and UAT)
    { id: 'REQ-H2', kind: 'requirement', title: '高重要度要件（一部未達）', criticality: 'high', depends_on: [] },
    { id: 'SPEC-H2', kind: 'specification', title: '高重要度仕様2', depends_on: ['REQ-H2'] },
    { id: 'TC-H2-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', verifies: ['SPEC-H2'], depends_on: [] },
    { id: 'TC-H2-IT', kind: 'test_case', title: 'ITa', test_level: 'integration_internal', test_method: 'scenario', verifies: ['SPEC-H2'], depends_on: [] },

    // Medium requirement with UT + ST
    { id: 'REQ-M1', kind: 'requirement', title: '中重要度要件', criticality: 'medium', depends_on: [] },
    { id: 'SPEC-M1', kind: 'specification', title: '中重要度仕様', depends_on: ['REQ-M1'] },
    { id: 'TC-M1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', verifies: ['SPEC-M1'], depends_on: [] },
    { id: 'TC-M1-ST', kind: 'test_case', title: 'ST', test_level: 'system', test_method: 'scenario', verifies: ['SPEC-M1'], depends_on: [] },

    // Low requirement with UT
    { id: 'REQ-L1', kind: 'requirement', title: '低重要度要件', criticality: 'low', depends_on: [] },
    { id: 'TC-L1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', verifies: ['REQ-L1'], depends_on: [] },
  ];

  for (const n of nodes) {
    graph.addNode(n);
  }

  // 2. Run SufficiencyScorer across all requirements
  const suffList = scorer.calculateAll(graph);
  assert.equal(suffList.length, 4);

  // REQ-H1: unit(30) + it_int(25) + sys(25) + uat(20) = 100
  const h1 = suffList.find(r => r.requirementId === 'REQ-H1')!;
  assert.equal(h1.score, 100);
  assert.equal(h1.isFullySatisfied, true);
  assert.equal(h1.missingPhases.length, 0);

  // REQ-H2: unit(30) + it_int(25) = 55 (< 80)
  const h2 = suffList.find(r => r.requirementId === 'REQ-H2')!;
  assert.equal(h2.score, 55);
  assert.equal(h2.isFullySatisfied, false);
  assert.ok(h2.missingPhases.includes('acceptance'));

  // REQ-M1: unit(50) + system(50) = 100 (>= 80)
  const m1 = suffList.find(r => r.requirementId === 'REQ-M1')!;
  assert.equal(m1.score, 100);
  assert.equal(m1.isFullySatisfied, true);

  // REQ-L1: unit = 100
  const l1 = suffList.find(r => r.requirementId === 'REQ-L1')!;
  assert.equal(l1.score, 100);
  assert.equal(l1.isFullySatisfied, true);

  // 3. Run BalanceAnalyzer strata and pyramid diagnosis
  const strata = analyzer.analyzeStrata(suffList, suffList.length);
  const unitStratum = strata.find(s => s.level === 'unit')!;
  assert.equal(unitStratum.count, 4);
  assert.equal(unitStratum.coverageRatio, 1.0);
  assert.equal(unitStratum.density, 'heavy');

  const itStratum = strata.find(s => s.level === 'integration_internal')!;
  assert.equal(itStratum.count, 2);
  assert.equal(itStratum.coverageRatio, 0.5);
  assert.equal(itStratum.density, 'adequate');

  const pyramid = analyzer.diagnosePyramid(graph, strata, suffList);
  assert.ok(pyramid);
  assert.ok(pyramid.status);
  assert.ok(Array.isArray(pyramid.warnings));
  assert.ok(Array.isArray(pyramid.suggestions));

  // Explicit zero-test and anti-pattern oracles protect the integration boundary.
  const emptyRequirement: DocNode = {
    id: 'REQ-EMPTY',
    kind: 'requirement',
    title: '未テスト要件',
    criticality: 'high',
    depends_on: [],
  };
  graph.addNode(emptyRequirement);
  const emptyResult = scorer.calculateRequirement(graph, emptyRequirement);
  assert.equal(emptyResult.score, 0);
  assert.equal(emptyResult.isFullySatisfied, false);
  assert.ok(emptyResult.missingPhases.includes('unit'));

  const inverted = BalanceAnalyzer.diagnoseFromCounts({
    unit: 1,
    integration_internal: 1,
    integration_external: 0,
    system: 10,
    acceptance: 20,
  });
  assert.equal(inverted.status, 'inverted_ice_cream');
  assert.ok(inverted.warnings.length > 0);

  const hollow = BalanceAnalyzer.diagnoseFromCounts({
    unit: 10,
    integration_internal: 0,
    integration_external: 0,
    system: 5,
    acceptance: 2,
  });
  assert.equal(hollow.status, 'hollow_hourglass');
  assert.ok(hollow.warnings.length > 0);
});
