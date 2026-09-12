import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { BalanceAnalyzer } from '../../src/core/analyzer/BalanceAnalyzer.js';
import { RequirementSufficiency, StratumReport } from '../../src/core/models/types.js';

/**
 * 【テスト概要】
 * - 対象: BalanceAnalyzer (テスト層充足度・密度分析)
 * - 条件: 高重要度REQ(unit=2, itA=1, sys=1, uat=1)および中重要度REQ(unit=1)のモックデータを渡して analyzeStrata を実行
 * - 期待結果: unit層のカバレッジ率が 1.0 (density: 'heavy')、integration_external層のカバレッジ率が 0.0 (density: 'missing') と正しく判定されること
 * - 関連文書: TC-0003, REQ-0003
 */
test('TC-0003: BalanceAnalyzer - 各テスト層のカバレッジ率および密度判定（heavy/missing等）が正しく計算されること', () => {
  const analyzer = new BalanceAnalyzer();

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

  const strata = analyzer.analyzeStrata(mockReqs, 2);
  const unitStratum = strata.find(s => s.level === 'unit')!;
  const intExtStratum = strata.find(s => s.level === 'integration_external')!;

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
 * - 期待結果: それぞれ 'inverted_ice_cream' および 'hollow_hourglass' として検出され、適切な日本語警告メッセージが出力されること
 * - 関連文書: TC-0003, REQ-0003
 */
test('TC-0003: BalanceAnalyzer - 逆アイスクリームコーン型および中間空洞化（砂時計型）のピラミッドアンチパターンを正確に検知できること', () => {
  const analyzer = new BalanceAnalyzer();
  const graph = new TraceGraph();

  // 1. Inverted Ice-Cream: unit=2, topLevel=35
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

  // 2. Hollow Hourglass: unit=10, integration=0, system=5
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
