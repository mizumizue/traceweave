import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { BalanceAnalyzer } from '../../src/core/analyzer/BalanceAnalyzer.js';
import { RequirementSufficiency, StratumReport } from '../../src/core/models/types.js';
import fs from 'node:fs';
import { TestRunnerRegistry } from '../../src/core/testing/TestRunnerRegistry.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: BalanceAnalyzer (テスト層充足度・密度分析)
 * - 条件: 高重要度REQ(unit=2, itA=1, sys=1, uat=1)および中重要度REQ(unit=1)のモックデータを渡して analyzeStrata を実行
 * - 期待結果: unit層のカバレッジ率が 1.0 (density: 'heavy')、integration_external層のカバレッジ率が 0.0 (density: 'missing') と正しく判定されること
 * - 関連文書: TC-ITb-0001-07, REQ-0003
 */
test('TC-ITb-0001-07: BalanceAnalyzer - 各テスト層のカバレッジ率および密度判定（heavy/missing等）が正しく計算されること', () => {
  const analyzer = new BalanceAnalyzer();
  const unitCoverage = {
    status: 'available' as const,
    totalFunctions: 10,
    testedFunctions: 10,
    functionCoverage: 1.0,
    branchCoverage: 0.8,
    lineCoverage: 0.9,
    density: 'heavy' as const,
    modules: [],
    untestedFunctions: [],
  };

  const mockReqs: RequirementSufficiency[] = [
    {
      requirementId: 'REQ-0001',
      title: 'Req 1',
      criticality: 'high',
      score: 100,
      isFullySatisfied: true,
      phaseCounts: {
        unit: 2,
        integration_internal: 1,
        integration_external: 0,
        system: 1,
        acceptance: 1,
      },
      methodCounts: {},
      associatedSpecs: [],
      testCaseIds: [],
      missingPhases: [],
    },
    {
      requirementId: 'REQ-0002',
      title: 'Req 2',
      criticality: 'medium',
      score: 50,
      isFullySatisfied: false,
      phaseCounts: {
        unit: 1,
        integration_internal: 0,
        integration_external: 0,
        system: 0,
        acceptance: 0,
      },
      methodCounts: {},
      associatedSpecs: [],
      testCaseIds: [],
      missingPhases: [],
    },
  ];

  const strata = analyzer.analyzeStrata(mockReqs, 2, undefined, unitCoverage);
  const unitStratum = strata.find(s => s.level === 'unit')!;
  const intExtStratum = strata.find(s => s.level === 'integration_external')!;

  assert.equal(unitStratum.metricSource, 'code_coverage');
  assert.equal(unitStratum.coverageRatio, 1.0);
  assert.equal(unitStratum.density, 'heavy');

  assert.equal(intExtStratum.coverageRatio, 0.0);
  assert.equal(intExtStratum.density, 'missing');
});

/**
 * 【テスト概要】
 * - 対象: BalanceAnalyzer (テストピラミッド形状・アンチパターン診断)
 * - 条件: 
 *   1. 上位層(ST/UAT)に偏重した逆ピラミッド（Inverted Ice-Cream）データを投入
 *   2. 中間結合層(ITa/ITb)が欠落した砂時計型（Hollow Hourglass）データを投入
 *   3. 結合テスト中心で全工程が揃った健全トロフィー（Healthy Trophy）データを投入
 *   4. 結合偏重かつシステムテスト欠落・単体僅少の不均衡（Unbalanced）データを投入
 * - 期待結果: それぞれ 'inverted_ice_cream', 'hollow_hourglass', 'healthy_trophy', 'unbalanced' として検出され、適切な警告・推奨メッセージが出力されること
 * - 関連文書: TC-ITb-0001-01, REQ-0003
 */
test('TC-ITb-0001-01: BalanceAnalyzer - 健全ピラミッド分布で healthy と判定されること', () => {
  const analyzer = new BalanceAnalyzer();
  const graph = new TraceGraph();
  const healthyStrata: StratumReport[] = [
    { level: 'unit', label: 'UT', count: 60, coverageRatio: 0.6, density: 'adequate' },
    { level: 'integration_internal', label: 'ITa', count: 25, coverageRatio: 0.25, density: 'adequate' },
    { level: 'integration_external', label: 'ITb', count: 10, coverageRatio: 0.1, density: 'thin' },
    { level: 'system', label: 'ST', count: 8, coverageRatio: 0.08, density: 'thin' },
    { level: 'acceptance', label: 'UAT', count: 2, coverageRatio: 0.02, density: 'thin' },
  ];
  const res0 = analyzer.diagnosePyramid(graph, healthyStrata, []);
  assert.equal(res0.status, 'healthy');
  assert.equal(res0.warnings.length, 0);
});

/**
 * 【テスト概要】
 * - 対象: BalanceAnalyzer (テストピラミッド形状・アンチパターン診断)
 * - 条件: 逆ピラミッド、砂時計、トロフィー、不均衡の各分布データを投入
 * - 期待結果: 各アンチパターンが正しく検出されること
 * - 関連文書: TC-ITb-0001-02..05, REQ-0003
 */
test('TC-ITb-0001-03: BalanceAnalyzer - 逆アイスクリームコーン型を検知できること', () => {
  const analyzer = new BalanceAnalyzer();
  const graph = new TraceGraph();

  const invertedStrata: StratumReport[] = [
    { level: 'unit', label: 'UT', count: 2, coverageRatio: 0.2, density: 'thin' },
    { level: 'integration_internal', label: 'ITa', count: 2, coverageRatio: 0.2, density: 'thin' },
    { level: 'integration_external', label: 'ITb', count: 1, coverageRatio: 0.1, density: 'thin' },
    { level: 'system', label: 'ST', count: 10, coverageRatio: 0.9, density: 'heavy' },
    { level: 'acceptance', label: 'UAT', count: 25, coverageRatio: 1.0, density: 'heavy' },
  ];

  const res1 = analyzer.diagnosePyramid(graph, invertedStrata, []);
  assert.equal(res1.status, 'inverted_ice_cream');
  assert.ok(res1.warnings.some(w => w.includes('逆ピラミッド')));
});

test('TC-ITb-0001-04: BalanceAnalyzer - 中間空洞化（砂時計型）を検知できること', () => {
  const analyzer = new BalanceAnalyzer();
  const graph = new TraceGraph();

  const hourglassStrata: StratumReport[] = [
    { level: 'unit', label: 'UT', count: 10, coverageRatio: 1.0, density: 'heavy' },
    { level: 'integration_internal', label: 'ITa', count: 0, coverageRatio: 0.0, density: 'missing' },
    { level: 'integration_external', label: 'ITb', count: 0, coverageRatio: 0.0, density: 'missing' },
    { level: 'system', label: 'ST', count: 5, coverageRatio: 0.8, density: 'heavy' },
    { level: 'acceptance', label: 'UAT', count: 2, coverageRatio: 0.5, density: 'adequate' },
  ];

  const res2 = analyzer.diagnosePyramid(graph, hourglassStrata, []);
  assert.equal(res2.status, 'hollow_hourglass');
  assert.ok(res2.warnings.some(w => w.includes('中間空洞化')));
});

test('TC-ITb-0001-02: BalanceAnalyzer - 健全トロフィー型を検知できること', () => {
  const analyzer = new BalanceAnalyzer();
  const graph = new TraceGraph();

  const trophyStrata: StratumReport[] = [
    { level: 'unit', label: 'UT', count: 20, coverageRatio: 0.6, density: 'adequate' },
    { level: 'integration_internal', label: 'ITa', count: 35, coverageRatio: 0.8, density: 'heavy' },
    { level: 'integration_external', label: 'ITb', count: 35, coverageRatio: 0.8, density: 'heavy' },
    { level: 'system', label: 'ST', count: 10, coverageRatio: 0.5, density: 'adequate' },
    { level: 'acceptance', label: 'UAT', count: 5, coverageRatio: 0.3, density: 'thin' },
  ];

  const res3 = analyzer.diagnosePyramid(graph, trophyStrata, []);
  assert.equal(res3.status, 'healthy_trophy');
  assert.equal(res3.warnings.length, 0);
});

test('TC-ITb-0001-05: BalanceAnalyzer - 不均衡・工程欠落型を検知できること', () => {
  const analyzer = new BalanceAnalyzer();
  const graph = new TraceGraph();

  const unbalancedStrata: StratumReport[] = [
    { level: 'unit', label: 'UT', count: 7, coverageRatio: 0.28, density: 'thin' },
    { level: 'integration_internal', label: 'ITa', count: 2, coverageRatio: 0.08, density: 'thin' },
    { level: 'integration_external', label: 'ITb', count: 40, coverageRatio: 0.88, density: 'heavy' },
    { level: 'system', label: 'ST', count: 0, coverageRatio: 0.0, density: 'missing' },
    { level: 'acceptance', label: 'UAT', count: 5, coverageRatio: 0.2, density: 'thin' },
  ];

  const res4 = analyzer.diagnosePyramid(graph, unbalancedStrata, []);
  assert.equal(res4.status, 'unbalanced');
  assert.ok(res4.warnings.some(w => w.includes('システムテスト (ST) が 0 件')));
  assert.ok(res4.warnings.some(w => w.includes('偏重')));
});

/**
 * 【テスト概要】
 * - 対象: BalanceAnalyzer (実行合格フィルタ・未テスト SPEC 警告区分)
 * - 条件: 実行合格 TC のみ紐づく SPEC、文書のみ（pending）TC のみ紐づく SPEC、TC 未紐付け SPEC を含むグラフ
 * - 期待結果: analyzeStrata は passed のみ集計し、diagnosePyramid は文書未紐付けと実行合格なしを別警告で出力すること
 * - 関連文書: REQ-0002, TC-ITb-0001-08
 */
test('TC-ITb-0001-08: BalanceAnalyzer - 実行合格 TC のみを工程集計し、文書のみと実行合格なしを区別して警告すること', () => {
  const analyzer = new BalanceAnalyzer();
  const graph = new TraceGraph();

  graph.addNode({ id: 'REQ-1', kind: 'requirement', title: 'Req', criticality: 'high', depends_on: [] });
  graph.addNode({ id: 'SPEC-PASS', kind: 'specification', title: 'Passed spec', depends_on: ['REQ-1'] });
  graph.addNode({ id: 'SPEC-DOC', kind: 'specification', title: 'Document only spec', depends_on: ['REQ-1'] });
  graph.addNode({ id: 'SPEC-EMPTY', kind: 'specification', title: 'No TC spec', depends_on: ['REQ-1'] });
  graph.addNode({
    id: 'TC-PASS',
    kind: 'test_case',
    title: 'Passed ITa',
    test_level: 'integration_internal',
    test_method: 'api_contract',
    verifies: ['SPEC-PASS'],
    depends_on: [],
    execution_status: 'passed',
  });
  graph.addNode({
    id: 'TC-PENDING',
    kind: 'test_case',
    title: 'Pending ITa',
    test_level: 'integration_internal',
    test_method: 'api_contract',
    verifies: ['SPEC-DOC'],
    depends_on: [],
    execution_status: 'pending',
  });

  const requirements: RequirementSufficiency[] = [
    {
      requirementId: 'REQ-1',
      title: 'Req',
      criticality: 'high',
      score: 30,
      isFullySatisfied: false,
      phaseCounts: { unit: 0, integration_internal: 1, integration_external: 0, system: 0, acceptance: 0 },
      documentedPhaseCounts: { unit: 0, integration_internal: 2, integration_external: 0, system: 0, acceptance: 0 },
      methodCounts: {},
      associatedSpecs: ['SPEC-PASS', 'SPEC-DOC', 'SPEC-EMPTY'],
      testCaseIds: ['TC-PASS', 'TC-PENDING'],
      missingPhases: [],
    },
  ];

  const strata = analyzer.analyzeStrata(requirements, 1, graph);
  const unitStratum = strata.find(s => s.level === 'unit')!;
  assert.equal(unitStratum.count, 0);
  assert.equal(unitStratum.metricSource, 'code_coverage');
  assert.equal(unitStratum.density, 'missing');

  const pyramid = analyzer.diagnosePyramid(graph, strata, requirements);
  assert.ok(pyramid.warnings.some(w => w.includes('テストケース文書が未紐付け') && w.includes('SPEC-EMPTY')));
  assert.ok(pyramid.warnings.some(w => w.includes('実行合格のテストケースがない') && w.includes('SPEC-DOC')));
});

test('TC-ITb-0001-06: BalanceAnalyzer - 外部パラメータセットの全診断パターンが実行結果と一致すること', () => {
  const dataset = JSON.parse(
    fs.readFileSync(repositoryPath('fixtures/test-cases/TC-ITb-0008.json'), 'utf8')
  );
  const result = TestRunnerRegistry.runDataset(dataset);
  assert.equal(result.total, 5);
  assert.equal(result.passed, 5);
  assert.equal(result.failed, 0);
  assert.deepEqual(result.results.map(item => item.actual.status), [
    'healthy',
    'healthy_trophy',
    'unbalanced',
    'inverted_ice_cream',
    'hollow_hourglass',
  ]);
});
