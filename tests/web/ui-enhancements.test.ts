import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';
import { PYRAMID_LAYERS } from '../../src/web/src/components/VisualTestPyramid.js';
import { getScoreColor } from '../../src/web/src/components/CircularGauge.js';
import { serializeMatrixCsv, serializeReportJson } from '../../src/web/src/utils/matrixData.js';

/**
 * 【テスト概要】
 * - 対象: Web公開契約（テストピラミッド、ゲージ閾値、エクスポート）
 * - 条件: 公開された工程・ゲージ・エクスポート契約と実ドキュメントの追跡グラフを呼び出す
 * - 期待結果: 公開契約が期待値を返し、REQ-0014/0015等のトレーサビリティが確立していること
 * - 関連文書: TC-ITb-0011, REQ-0014, REQ-0015, SPEC-0014, SPEC-0015
 */
test('TC-ITb-0011: Web公開契約 - テストピラミッド、ゲージ閾値、エクスポートの検証', () => {
  assert.equal(PYRAMID_LAYERS.length, 5);
  assert.deepEqual(PYRAMID_LAYERS.map(layer => layer.level), [
    'acceptance',
    'system',
    'integration_external',
    'integration_internal',
    'unit',
  ]);
  assert.equal(getScoreColor(80).stroke, '#2dd4bf');
  assert.equal(getScoreColor(50).stroke, '#fbbf24');
  assert.equal(getScoreColor(49).stroke, '#fb7185');

  const { report, graph } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const req0014 = graph.getNode('REQ-0014');
  assert.ok(req0014, 'REQ-0014 must exist in the graph');
  const spec0014 = graph.getNode('SPEC-0014');
  assert.ok(spec0014, 'SPEC-0014 must exist in the graph');
  assert.deepEqual(spec0014?.depends_on, ['REQ-0014']);

  const tc0015 = graph.getNode('TC-ITb-0011');
  assert.ok(tc0015, 'TC-ITb-0011 must exist in the graph');
  assert.ok(tc0015?.verifies?.includes('REQ-0014'));
  assert.ok(tc0015?.verifies?.includes('REQ-0015'));
  assert.ok(tc0015?.verifies?.includes('SPEC-0014'));
  assert.ok(tc0015?.verifies?.includes('SPEC-0015'));
  assert.ok(serializeMatrixCsv(report.matrix).includes('Requirement ID'));
  assert.ok(serializeReportJson(report).includes('"summary"'));
});
