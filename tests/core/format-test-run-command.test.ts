import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertTestCaseId,
  formatTestRunCommand,
  parseTestCaseFilter,
  resolveTestFilesForCase,
  testFileDeclaresCase,
  testNamePatternForCase,
} from '../../src/core/testing/formatTestRunCommand.js';
import { repositoryPath } from '../helpers/repo-path.js';

const testsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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

/**
 * 【テスト概要】
 * - 対象: resolveTestFilesForCase / testNamePatternForCase (TC 単体実行のファイル絞り込み)
 * - 条件: TC-0033 を宣言する port-manager テストと、文字列参照のみの format-test-run-command テスト
 * - 期待結果: test() 宣言を含むファイルのみ解決され、名前パターンは TC ID 先頭一致になること
 */
test('resolveTestFilesForCase - test() 宣言を含むファイルのみ TC 単体実行対象として解決されること', () => {
  assert.equal(testNamePatternForCase('TC-0033'), '^TC-0033:');
  assert.equal(
    testFileDeclaresCase("test('TC-0033: PortManager - ...', () => {})", 'TC-0033'),
    true
  );
  assert.equal(
    testFileDeclaresCase("assert.equal(formatTestRunCommand('TC-0033'), '...')", 'TC-0033'),
    false
  );

  const matches = resolveTestFilesForCase(testsDir, 'TC-0033');
  assert.deepEqual(
    matches.map(p => path.relative(repositoryPath('.'), p).replaceAll('\\', '/')),
    ['tests/infrastructure/port-manager.test.ts']
  );
});
