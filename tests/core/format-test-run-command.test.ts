import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTestCaseId,
  formatTestRunCommand,
  parseTestCaseFilter,
} from '../../src/core/testing/formatTestRunCommand.js';

/**
 * 【テスト概要】
 * - 対象: formatTestRunCommand (CLI テスト実行コマンド整形)
 * - 条件: テストケース ID あり・なしの両パターン
 * - 期待結果: クリーンルート規約に沿った npm --prefix src 形式のコマンドが返ること
 */
test('formatTestRunCommand - 全件実行と個別 TC 実行の CLI コマンドが正しく整形されること', () => {
  assert.equal(formatTestRunCommand(), 'npm --prefix src test');
  assert.equal(formatTestRunCommand('TC-0033'), 'npm --prefix src test -- --tc TC-0033');
});

/**
 * 【テスト概要】
 * - 対象: parseTestCaseFilter / assertTestCaseId (テストランナー引数解析)
 * - 条件: --tc / --test-case フラグと不正 ID
 * - 期待結果: TC-xxxx 形式のみ受理され、不正入力は例外となること
 */
test('parseTestCaseFilter - --tc および --test-case フラグから TC ID を解析できること', () => {
  assert.equal(parseTestCaseFilter(['--tc', 'TC-0001']), 'TC-0001');
  assert.equal(parseTestCaseFilter(['node', 'script.ts', '--test-case', 'TC-0042']), 'TC-0042');
  assert.equal(parseTestCaseFilter(['--verbose']), undefined);

  assert.throws(() => parseTestCaseFilter(['--tc']), /requires a test case id/);
  assert.throws(() => parseTestCaseFilter(['--tc', 'TC-1']), /Invalid test case id/);
  assert.throws(() => assertTestCaseId('REQ-0001'), /Invalid test case id/);
});
