import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runGovernanceLint } from '../../scripts/run-governance-lint.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

/**
 * 【テスト概要】
 * - 対象: runGovernanceLint (統合ガバナンス lint)
 * - 条件: 現在の TraceWeave リポジトリ全体を検証対象として実行
 * - 期待結果: スキーマ・ローカルパス・クリーンルートの3検証がすべて passed: true となること
 * - 関連文書: implementation-workflow.mdc
 */
test('runGovernanceLint - 現行リポジトリが統合ガバナンス lint をすべて通過すること', () => {
  const result = runGovernanceLint(ROOT);
  assert.equal(result.passed, true, JSON.stringify(result, null, 2));
  assert.equal(result.docs.passed, true);
  assert.equal(result.localPaths.passed, true);
  assert.equal(result.cleanRoot.passed, true);
});
