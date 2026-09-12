import test from 'node:test';
import assert from 'node:assert/strict';
import { StratumReport, PyramidHealthReport } from '../../src/core/models/types.js';
import {
  calculatePyramidLayerMetrics,
  createPyramidLayerClickHandler,
  PYRAMID_LAYERS,
} from '../../src/web/src/components/VisualTestPyramid.js';

/**
 * 【テスト概要】
 * - 対象: VisualTestPyramid（工程地層データに基づく各ピラミッド層の構成比率および幅比率計算）
 * - 条件: 5大工程（UT: 50件, ITa: 20件, ITb: 10件, ST: 15件, UAT: 5件、合計100件）のデータを投入
 * - 期待結果: 各層の構成比率（50%, 20%, 10%, 15%, 5%）が正確に算出され、ピラミッド幅（35%〜96%）の階層順序が維持されること
 * - 関連文書: TC-0022, REQ-0014, SPEC-0014
 */
test('TC-0022: VisualTestPyramid - 5大工程のテスト件数から全体構成比率および階層幅比率が正確に計算されること', () => {
  const dummyStrata: StratumReport[] = [
    { level: 'unit', label: '単体テスト (UT)', count: 50, coverageRatio: 0.8, density: 'heavy' },
    { level: 'integration_internal', label: '内部結合テスト (ITa)', count: 20, coverageRatio: 0.6, density: 'adequate' },
    { level: 'integration_external', label: '外部結合テスト (ITb)', count: 10, coverageRatio: 0.4, density: 'thin' },
    { level: 'system', label: '総合テスト (ST)', count: 15, coverageRatio: 0.5, density: 'adequate' },
    { level: 'acceptance', label: '受入テスト (UAT)', count: 5, coverageRatio: 0.3, density: 'thin' },
  ];

  const pyramidLayers = PYRAMID_LAYERS;

  // Validate width gradient from top to base
  for (let i = 0; i < pyramidLayers.length - 1; i++) {
    assert.ok(
      pyramidLayers[i].widthPercent < pyramidLayers[i + 1].widthPercent,
      `Layer ${pyramidLayers[i].level} width should be smaller than ${pyramidLayers[i + 1].level}`
    );
  }

  // Validate percentage of total calculations
  const metrics = calculatePyramidLayerMetrics(dummyStrata);
  assert.deepEqual(metrics.map(({ level, count, ratioPercent }) => ({
    level,
    count,
    ratioPercent,
  })), [
    { level: 'acceptance', count: 5, ratioPercent: 5 },
    { level: 'system', count: 15, ratioPercent: 15 },
    { level: 'integration_external', count: 10, ratioPercent: 10 },
    { level: 'integration_internal', count: 20, ratioPercent: 20 },
    { level: 'unit', count: 50, ratioPercent: 50 },
  ]);

  assert.deepEqual(metrics.map(({ level, coveragePercent }) => ({ level, coveragePercent })), [
    { level: 'acceptance', coveragePercent: 30 },
    { level: 'system', coveragePercent: 50 },
    { level: 'integration_external', coveragePercent: 40 },
    { level: 'integration_internal', coveragePercent: 60 },
    { level: 'unit', coveragePercent: 80 },
  ]);
});

/**
 * 【テスト概要】
 * - 対象: VisualTestPyramid（層クリックによる工程フィルター連動コールバック）
 * - 条件: 任意のピラミッド工程層（unit, integration_internal等）をクリックした際のイベントを発火
 * - 期待結果: onFilterPhase コールバックに対象の工程識別子（'unit'等）が正しく渡されること
 * - 関連文書: TC-0022, REQ-0014, SPEC-0014
 */
test('TC-0022: VisualTestPyramid - ピラミッド層クリック時に対象工程識別子がコールバックへ渡されること', () => {
  let selectedPhase: string | null = null;
  const onFilterPhase = (phase: string) => {
    selectedPhase = phase;
  };

  const handleLayerClick = createPyramidLayerClickHandler(onFilterPhase);
  handleLayerClick('unit');
  assert.equal(selectedPhase, 'unit');

  // Simulate clicking Integration Internal layer
  handleLayerClick('integration_internal');
  assert.equal(selectedPhase, 'integration_internal');

  // Simulate clicking Acceptance layer
  handleLayerClick('acceptance');
  assert.equal(selectedPhase, 'acceptance');
});
