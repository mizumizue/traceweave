import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';
import { appendModalHistory, moveModalHistory } from '../../src/web/src/components/modalNavigation.js';
import { calculatePyramidLayerMetrics, PYRAMID_LAYERS } from '../../src/web/src/components/VisualTestPyramid.js';
import { filterMatrixRows, serializeMatrixCsv, serializeMatrixJson } from '../../src/web/src/utils/matrixData.js';

/**
 * 【テスト概要】
 * - 対象: Web UIインタラクティブ機能総合検証（モーダル履歴・立体ピラミッド連動・多軸フィルターエクスポート）
 * - 条件: モーダル履歴、ピラミッド指標、フィルター、エクスポートの公開契約およびトレーサビリティ連鎖を検証
 * - 期待結果: 公開契約が期待値を返し、REQ-0013/0014/0015およびSPEC-0013/0014/0015の追跡性が確立していること
 * - 関連文書: TC-0024, REQ-0013, REQ-0014, REQ-0015, SPEC-0013, SPEC-0014, SPEC-0015
 */
test('TC-0024: Web UIインタラクティブ機能（モーダル履歴・立体ピラミッド連動・多軸フィルターエクスポート）の総合検証', () => {
  const { graph, report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  let history = appendModalHistory({ history: ['REQ-0013'], index: 0 }, 'SPEC-0013');
  history = moveModalHistory(history, 'back');
  assert.equal(history.history[history.index], 'REQ-0013');
  const pyramidMetrics = calculatePyramidLayerMetrics(report.strata);
  assert.equal(pyramidMetrics.length, 5);
  assert.deepEqual(pyramidMetrics.map(layer => layer.level), PYRAMID_LAYERS.map(layer => layer.level));
  assert.ok(pyramidMetrics.every(layer => layer.ratioPercent >= 0 && layer.ratioPercent <= 100));
  assert.ok(pyramidMetrics.every(layer => layer.coveragePercent >= 0 && layer.coveragePercent <= 100));
  const filtered = filterMatrixRows(report.matrix, { criticality: 'high' });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(row => row.criticality === 'high'));
  assert.ok(serializeMatrixCsv(filtered).includes('Requirement ID'));
  assert.ok(serializeMatrixJson(filtered).startsWith('['));

  // REQ-0013 and SPEC-0013
  const req0013 = graph.getNode('REQ-0013');
  assert.ok(req0013, 'REQ-0013 must exist in the graph');
  const spec0013 = graph.getNode('SPEC-0013');
  assert.ok(spec0013, 'SPEC-0013 must exist in the graph');
  assert.deepEqual(spec0013?.depends_on, ['REQ-0013']);

  // REQ-0014 and SPEC-0014
  const req0014 = graph.getNode('REQ-0014');
  assert.ok(req0014, 'REQ-0014 must exist in the graph');
  const spec0014 = graph.getNode('SPEC-0014');
  assert.ok(spec0014, 'SPEC-0014 must exist in the graph');
  assert.deepEqual(spec0014?.depends_on, ['REQ-0014']);

  // REQ-0015 and SPEC-0015
  const req0015 = graph.getNode('REQ-0015');
  assert.ok(req0015, 'REQ-0015 must exist in the graph');
  const spec0015 = graph.getNode('SPEC-0015');
  assert.ok(spec0015, 'SPEC-0015 must exist in the graph');
  assert.deepEqual(spec0015?.depends_on, ['REQ-0015']);

  // TC-0024 verification
  const tc0024 = graph.getNode('TC-0024');
  assert.ok(tc0024, 'TC-0024 must exist in the graph');
  assert.ok(tc0024?.verifies?.includes('REQ-0013'));
  assert.ok(tc0024?.verifies?.includes('REQ-0014'));
  assert.ok(tc0024?.verifies?.includes('REQ-0015'));
  assert.ok(tc0024?.verifies?.includes('SPEC-0013'));
  assert.ok(tc0024?.verifies?.includes('SPEC-0014'));
  assert.ok(tc0024?.verifies?.includes('SPEC-0015'));
});
