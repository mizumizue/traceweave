import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';
import { appendModalHistory, moveModalHistory } from '../../src/web/src/components/modalNavigation.js';
import { createPyramidLayerClickHandler } from '../../src/web/src/components/VisualTestPyramid.js';
import { filterMatrixRows, serializeMatrixCsv, serializeMatrixJson } from '../../src/web/src/utils/matrixData.js';

/**
 * 【テスト概要】
 * - 対象: Web UIで共有される公開状態・データ変換契約（モーダル履歴、ピラミッド選択、マトリクス変換）
 * - 条件: UIコンポーネントから利用される公開ヘルパーへ入力を渡し、状態遷移と出力を検査（React DOM、通知表示、クリップボード API は対象外）
 * - 期待結果: ピラミッド層クリックとマトリクス絞り込み、モーダル閲覧履歴遷移、エクスポート出力が一貫して連動すること。通知表示は対象外とする
 * - 関連文書: TC-0029, REQ-0013, REQ-0014, REQ-0015, SPEC-0013, SPEC-0014, SPEC-0015
 */
test('TC-0029: Web UIコンポーネント間連携（モーダル履歴・ピラミッド連動・フィルターエクスポート）の外部結合検証', () => {
  const { graph, report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  let history = appendModalHistory({ history: ['REQ-0013'], index: 0 }, 'REQ-0014');
  history = moveModalHistory(history, 'forward');
  assert.equal(history.history[history.index], 'REQ-0014');
  let selectedPhase = '';
  createPyramidLayerClickHandler(phase => {
    selectedPhase = phase;
  })('unit');
  assert.equal(selectedPhase, 'unit');
  const filtered = filterMatrixRows(report.matrix, { phase: 'unit' });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(row => row.allTestCases.some(testCase => testCase.level === 'unit')));
  assert.ok(serializeMatrixCsv(filtered).includes('Need ID'));
  assert.ok(serializeMatrixJson(filtered).length > 2);
  const tc0029 = graph.getNode('TC-0029');
  assert.ok(tc0029, 'TC-0029 must exist in graph');
  assert.ok(tc0029?.verifies?.includes('REQ-0013'));
  assert.ok(tc0029?.verifies?.includes('REQ-0014'));
  assert.ok(tc0029?.verifies?.includes('REQ-0015'));
  assert.ok(tc0029?.verifies?.includes('SPEC-0013'));
  assert.ok(tc0029?.verifies?.includes('SPEC-0014'));
  assert.ok(tc0029?.verifies?.includes('SPEC-0015'));
});
