import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCircularGauge, getScoreColor } from '../../src/web/src/components/CircularGauge.js';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: CircularGauge (SVG円形ゲージ座標・オフセット幾何計算)
 * - 条件: 0%、50%、100%のパーセンテージ、ならびに負数(-25%)、100%超過(150%)、NaNの境界値を入力
 * - 期待結果: 半径・円周長・strokeDashoffsetが幾何学的に正しく計算され、異常値・超過値が0〜100に安全にクランプされること
 * - 関連文書: TC-0012, REQ-0010, SPEC-0010
 */
test('TC-0012: CircularGauge - 0%〜100%の境界値計算、超過・負数クランプ処理、および円周オフセットが正確に計算されること', () => {
  // Test at 0%
  const geo0 = calculateCircularGauge(0, 40, 4);
  assert.equal(geo0.clampedPercentage, 0);
  assert.equal(geo0.radius, 18); // (40 - 4) / 2
  assert.ok(Math.abs(geo0.circumference - 2 * Math.PI * 18) < 0.001);
  assert.ok(Math.abs(geo0.strokeDashoffset - geo0.circumference) < 0.001, 'Offset at 0% should equal circumference');

  // Test at 100%
  const geo100 = calculateCircularGauge(100, 40, 4);
  assert.equal(geo100.clampedPercentage, 100);
  assert.ok(Math.abs(geo100.strokeDashoffset) < 0.001, 'Offset at 100% should be zero');

  // Test at 50%
  const geo50 = calculateCircularGauge(50, 40, 4);
  assert.equal(geo50.clampedPercentage, 50);
  assert.ok(
    Math.abs(geo50.strokeDashoffset - geo50.circumference / 2) < 0.001,
    'Offset at 50% should be half circumference'
  );

  // Test clamping for negative and over 100 values
  const geoNeg = calculateCircularGauge(-25, 40, 4);
  assert.equal(geoNeg.clampedPercentage, 0);

  const geoOver = calculateCircularGauge(150, 40, 4);
  assert.equal(geoOver.clampedPercentage, 100);

  // Test NaN handling
  const geoNaN = calculateCircularGauge(NaN, 40, 4);
  assert.equal(geoNaN.clampedPercentage, 0);
});

/**
 * 【テスト概要】
 * - 対象: CircularGauge (スコアに応じた配色閾値判定)
 * - 条件: 85点/80点(高スコア)、65点/50点(中スコア)、49点/0点(低スコア)の各値を判定
 * - 期待結果: 80点以上でteal(#2dd4bf)、50〜79点でamber(#fbbf24)、50点未満でrose(#fb7185)のstroke/textカラーが返されること
 * - 関連文書: TC-0012, REQ-0010, SPEC-0010
 */
test('TC-0012: CircularGauge - スコア閾値（80%以上: teal、50%〜79%: amber、50%未満: rose）に応じた配色定義が正しく返されること', () => {
  // >= 80 -> teal
  const colorsHigh = getScoreColor(85);
  assert.equal(colorsHigh.stroke, '#2dd4bf');
  assert.ok(colorsHigh.text.includes('teal'));

  const colors80 = getScoreColor(80);
  assert.equal(colors80.stroke, '#2dd4bf');

  // 50..79 -> amber
  const colorsMid = getScoreColor(65);
  assert.equal(colorsMid.stroke, '#fbbf24');
  assert.ok(colorsMid.text.includes('amber'));

  const colors50 = getScoreColor(50);
  assert.equal(colors50.stroke, '#fbbf24');

  // < 50 -> rose
  const colorsLow = getScoreColor(49);
  assert.equal(colorsLow.stroke, '#fb7185');
  assert.ok(colorsLow.text.includes('rose'));

  const colors0 = getScoreColor(0);
  assert.equal(colors0.stroke, '#fb7185');
});

/**
 * 【テスト概要】
 * - 対象: CircularGauge & TraceWeave レポート統合
 * - 条件: docs/ 配下の実ドキュメントからレポートを生成し、全体スコア、各要件行スコア、各テスト層カバレッジ率を検査
 * - 期待結果: 全てのスコア・割合が円形ゲージ幾何計算に適合し、REQ-0010・SPEC-0010・TC-0012/0013のトレーサビリティ連鎖が確立していること
 * - 関連文書: TC-0013, REQ-0010, SPEC-0010
 */
test('TC-0013: CircularGauge - ダッシュボード全体の各指標（全体スコア、要件行、テスト層カバレッジ）への円形ゲージ統合およびトレーサビリティの検証', () => {
  const { report, graph } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });

  // 1. Header Global Scores
  assert.ok(
    report.summary.overallSufficiencyScore >= 0 && report.summary.overallSufficiencyScore <= 100,
    'Overall sufficiency score must be between 0 and 100'
  );
  assert.ok(
    report.summary.highCriticalityCoverage >= 0 && report.summary.highCriticalityCoverage <= 100,
    'High criticality coverage must be between 0 and 100'
  );

  // 2. Matrix Row Scores (each requirement row has score for circular gauge)
  assert.ok(report.matrix.length >= 8, 'Matrix should contain requirements including REQ-0010');
  for (const row of report.matrix) {
    assert.ok(row.score >= 0 && row.score <= 100, `Row ${row.requirementId} score should be in [0, 100]`);
    const geo = calculateCircularGauge(row.score, 38, 4);
    assert.equal(geo.clampedPercentage, row.score);
  }

  // 3. Strata Coverage Ratios (each phase has coverageRatio for circular gauge)
  assert.equal(report.strata.length, 5, 'Should have 5 stratum test phases');
  for (const stratum of report.strata) {
    assert.ok(stratum.coverageRatio >= 0 && stratum.coverageRatio <= 1, 'Coverage ratio should be in [0, 1]');
    const percent = Math.round(stratum.coverageRatio * 100);
    const geo = calculateCircularGauge(percent, 48, 4.5);
    assert.equal(geo.clampedPercentage, percent);
  }

  // 4. Traceability link verification for REQ-0010 and SPEC-0010
  const req0010 = graph.getNode('REQ-0010');
  assert.ok(req0010, 'REQ-0010 must exist in the graph');
  assert.deepEqual(req0010?.depends_on, ['NEED-0001']);

  const spec0010 = graph.getNode('SPEC-0010');
  assert.ok(spec0010, 'SPEC-0010 must exist in the graph');
  assert.deepEqual(spec0010?.depends_on, ['REQ-0010']);

  const tc0012 = graph.getNode('TC-0012');
  assert.ok(tc0012, 'TC-0012 must exist in the graph');
  assert.ok(tc0012?.verifies?.includes('REQ-0010'));
  assert.ok(tc0012?.verifies?.includes('SPEC-0010'));

  const tc0013 = graph.getNode('TC-0013');
  assert.ok(tc0013, 'TC-0013 must exist in the graph');
  assert.ok(tc0013?.verifies?.includes('REQ-0010'));
  assert.ok(tc0013?.verifies?.includes('SPEC-0010'));
});
