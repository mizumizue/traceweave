import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { SufficiencyScorer } from '../../src/core/sufficiency/SufficiencyScorer.js';
import { BalanceAnalyzer } from '../../src/core/analyzer/BalanceAnalyzer.js';
import { DocNode } from '../../src/core/models/types.js';

/**
 * 【テスト概要】
 * - 対象: SufficiencyScorer, BalanceAnalyzer, TraceGraph（有向グラフと品質充足度・ピラミッド地層分析の内部結合）
 * - 条件: High/Medium/Low 要件と複数工程の TC を含むグラフを構築し、実行合格（execution_status: passed）のみがスコア加算対象となるよう TC ステータスを付与して結合解析を実行
 * - 期待結果: 実行合格 TC のみで重要度別スコアが算出され、pending の TC は加算されないこと。100% 充足要件は全 TC 合格、一部未達要件は passed/pending 混在で REQ-0002 準拠の低スコアとなること。地層密度・ピラミッド診断も実行合格件数に基づくこと
 * - 関連文書: TC-ITa-0001, REQ-0002, REQ-0003, SPEC-0003
 */
test('TC-ITa-0001: SufficiencyScorer & BalanceAnalyzer - 有向グラフからの重要度別スコアリングと工程地層密度・ピラミッド診断の内部結合検証', () => {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();
  const analyzer = new BalanceAnalyzer();

  // 1. Build test graph with requirements and test cases
  const nodes: DocNode[] = [
    // High requirement with full coverage
    { id: 'REQ-H1', kind: 'requirement', title: '高重要度要件（完備）', criticality: 'high', depends_on: [] },
    { id: 'SPEC-H1', kind: 'specification', title: '高重要度仕様', depends_on: ['REQ-H1'] },
    { id: 'TC-H1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', execution_status: 'passed', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-IT', kind: 'test_case', title: 'ITa', test_level: 'integration_internal', test_method: 'scenario', execution_status: 'passed', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-ST', kind: 'test_case', title: 'ST', test_level: 'system', test_method: 'scenario', execution_status: 'passed', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-UAT', kind: 'test_case', title: 'UAT', test_level: 'acceptance', test_method: 'exploratory_manual', execution_status: 'passed', verifies: ['SPEC-H1'], depends_on: [] },

    // High requirement: UT passed, ITa pending (documented but not executed — REQ-0002 AC-004)
    { id: 'REQ-H2', kind: 'requirement', title: '高重要度要件（一部未達）', criticality: 'high', depends_on: [] },
    { id: 'SPEC-H2', kind: 'specification', title: '高重要度仕様2', depends_on: ['REQ-H2'] },
    { id: 'TC-H2-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', execution_status: 'passed', verifies: ['SPEC-H2'], depends_on: [] },
    { id: 'TC-H2-IT', kind: 'test_case', title: 'ITa', test_level: 'integration_internal', test_method: 'scenario', execution_status: 'pending', verifies: ['SPEC-H2'], depends_on: [] },

    // Medium requirement with UT + ST (both passed)
    { id: 'REQ-M1', kind: 'requirement', title: '中重要度要件', criticality: 'medium', depends_on: [] },
    { id: 'SPEC-M1', kind: 'specification', title: '中重要度仕様', depends_on: ['REQ-M1'] },
    { id: 'TC-M1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', execution_status: 'passed', verifies: ['SPEC-M1'], depends_on: [] },
    { id: 'TC-M1-ST', kind: 'test_case', title: 'ST', test_level: 'system', test_method: 'scenario', execution_status: 'passed', verifies: ['SPEC-M1'], depends_on: [] },

    // Low requirement with UT (passed)
    { id: 'REQ-L1', kind: 'requirement', title: '低重要度要件', criticality: 'low', depends_on: [] },
    { id: 'TC-L1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', execution_status: 'passed', verifies: ['REQ-L1'], depends_on: [] },
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

  // REQ-H2: unit excluded from traceability; ITa pending => score 0
  const h2 = suffList.find(r => r.requirementId === 'REQ-H2')!;
  assert.equal(h2.score, 0);
  assert.equal(h2.isFullySatisfied, false);
  assert.ok(h2.pendingTestCaseIds.includes('TC-H2-IT'));
  assert.ok(h2.missingPhases.includes('integration_internal'));
  assert.ok(h2.missingPhases.includes('acceptance'));

  // REQ-M1: system(50) only — unit excluded; needs ITa for full medium score
  const m1 = suffList.find(r => r.requirementId === 'REQ-M1')!;
  assert.equal(m1.score, 50);
  assert.equal(m1.isFullySatisfied, false);

  // REQ-L1: unit only => 0 under traceability scoring
  const l1 = suffList.find(r => r.requirementId === 'REQ-L1')!;
  assert.equal(l1.score, 0);
  assert.equal(l1.isFullySatisfied, false);

  const unitCoverage = {
    status: 'available' as const,
    totalFunctions: 10,
    testedFunctions: 8,
    functionCoverage: 0.8,
    branchCoverage: 0.75,
    lineCoverage: 0.7,
    density: 'heavy' as const,
    modules: [],
    untestedFunctions: [],
  };

  // 3. Run BalanceAnalyzer strata and pyramid diagnosis
  const strata = analyzer.analyzeStrata(suffList, suffList.length, graph, unitCoverage);
  const unitStratum = strata.find(s => s.level === 'unit')!;
  assert.equal(unitStratum.count, 8);
  assert.equal(unitStratum.coverageRatio, 0.8);
  assert.equal(unitStratum.metricSource, 'code_coverage');
  assert.equal(unitStratum.density, 'heavy');

  const itStratum = strata.find(s => s.level === 'integration_internal')!;
  assert.equal(itStratum.count, 1);
  assert.equal(itStratum.coverageRatio, 0.25);
  assert.equal(itStratum.density, 'thin');

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
  assert.ok(emptyResult.missingPhases.includes('integration_internal'));

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
