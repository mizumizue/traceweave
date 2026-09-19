import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { SufficiencyScorer } from '../../src/core/sufficiency/SufficiencyScorer.js';
import { BalanceAnalyzer } from '../../src/core/analyzer/BalanceAnalyzer.js';
import { DocNode } from '../../src/core/models/types.js';

function buildIntegrationGraph(): { graph: TraceGraph; suffList: ReturnType<SufficiencyScorer['calculateAll']> } {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();
  const nodes: DocNode[] = [
    { id: 'REQ-H1', kind: 'requirement', title: '高重要度要件（完備）', criticality: 'high', depends_on: [] },
    { id: 'SPEC-H1', kind: 'specification', title: '高重要度仕様', depends_on: ['REQ-H1'] },
    { id: 'TC-H1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', execution_status: 'passed', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-IT', kind: 'test_case', title: 'ITa', test_level: 'integration_internal', test_method: 'scenario', execution_status: 'passed', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-ST', kind: 'test_case', title: 'ST', test_level: 'system', test_method: 'scenario', execution_status: 'passed', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'TC-H1-UAT', kind: 'test_case', title: 'UAT', test_level: 'acceptance', test_method: 'exploratory_manual', execution_status: 'passed', verifies: ['SPEC-H1'], depends_on: [] },
    { id: 'REQ-H2', kind: 'requirement', title: '高重要度要件（一部未達）', criticality: 'high', depends_on: [] },
    { id: 'SPEC-H2', kind: 'specification', title: '高重要度仕様2', depends_on: ['REQ-H2'] },
    { id: 'TC-H2-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', execution_status: 'passed', verifies: ['SPEC-H2'], depends_on: [] },
    { id: 'TC-H2-IT', kind: 'test_case', title: 'ITa', test_level: 'integration_internal', test_method: 'scenario', execution_status: 'pending', verifies: ['SPEC-H2'], depends_on: [] },
    { id: 'REQ-M1', kind: 'requirement', title: '中重要度要件', criticality: 'medium', depends_on: [] },
    { id: 'SPEC-M1', kind: 'specification', title: '中重要度仕様', depends_on: ['REQ-M1'] },
    { id: 'TC-M1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', execution_status: 'passed', verifies: ['SPEC-M1'], depends_on: [] },
    { id: 'TC-M1-ST', kind: 'test_case', title: 'ST', test_level: 'system', test_method: 'scenario', execution_status: 'passed', verifies: ['SPEC-M1'], depends_on: [] },
    { id: 'REQ-L1', kind: 'requirement', title: '低重要度要件', criticality: 'low', depends_on: [] },
    { id: 'TC-L1-UT', kind: 'test_case', title: 'UT', test_level: 'unit', test_method: 'unit_mock', execution_status: 'passed', verifies: ['REQ-L1'], depends_on: [] },
  ];
  for (const n of nodes) graph.addNode(n);
  const suffList = scorer.calculateAll(graph);
  return { graph, suffList };
}

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

test('TC-ITa-0001-01: SufficiencyScorer - 実行合格 TC のみで要件充足度を算出すること', () => {
  const { suffList } = buildIntegrationGraph();
  assert.equal(suffList.length, 4);
  const h1 = suffList.find(r => r.requirementId === 'REQ-H1')!;
  assert.equal(h1.score, 100);
  assert.equal(h1.isFullySatisfied, true);
  const h2 = suffList.find(r => r.requirementId === 'REQ-H2')!;
  assert.equal(h2.score, 0);
  assert.ok(h2.pendingTestCaseIds.includes('TC-H2-IT'));
  const l1 = suffList.find(r => r.requirementId === 'REQ-L1')!;
  assert.equal(l1.score, 0);
});

test('TC-ITa-0001-02: BalanceAnalyzer - 工程地層密度と単体カバレッジ指標が整合すること', () => {
  const { graph, suffList } = buildIntegrationGraph();
  const analyzer = new BalanceAnalyzer();
  const strata = analyzer.analyzeStrata(suffList, suffList.length, graph, unitCoverage);
  const unitStratum = strata.find(s => s.level === 'unit')!;
  assert.equal(unitStratum.metricSource, 'code_coverage');
  assert.equal(unitStratum.density, 'heavy');
  const itStratum = strata.find(s => s.level === 'integration_internal')!;
  assert.equal(itStratum.density, 'thin');
});

test('TC-ITa-0001-03: BalanceAnalyzer - グラフと地層からピラミッド診断を返すこと', () => {
  const { graph, suffList } = buildIntegrationGraph();
  const analyzer = new BalanceAnalyzer();
  const strata = analyzer.analyzeStrata(suffList, suffList.length, graph, unitCoverage);
  const pyramid = analyzer.diagnosePyramid(graph, strata, suffList);
  assert.ok(pyramid.status);
  assert.ok(Array.isArray(pyramid.warnings));
  assert.ok(Array.isArray(pyramid.suggestions));
});

test('TC-ITa-0001-04: 未テスト要件とピラミッドアンチパターンで警告が返ること', () => {
  const graph = new TraceGraph();
  const scorer = new SufficiencyScorer();
  graph.addNode({
    id: 'REQ-EMPTY',
    kind: 'requirement',
    title: '未テスト要件',
    criticality: 'high',
    depends_on: [],
  });
  const emptyResult = scorer.calculateRequirement(graph, graph.getNode('REQ-EMPTY')!);
  assert.equal(emptyResult.score, 0);
  assert.equal(emptyResult.isFullySatisfied, false);
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
