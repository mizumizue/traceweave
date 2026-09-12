import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDocs } from '../../src/application/check-docs.js';

/**
 * 【テスト概要】
 * - 対象: checkDocs (CLIドキュメント整合性チェッカー)
 * - 条件: 正常な docs/ ディレクトリを対象に通常モードで検証を実行
 * - 期待結果: 検証結果が合格(passed: true)、エラー件数が0件、要件総数が7件以上のサマリーレポートが得られること
 * - 関連文書: TC-0005, REQ-0005
 */
test('TC-0005: checkDocs - 正常なドキュメント群に対して検証エラーが0件となり合格判定されること', () => {
  const result = checkDocs({ docsDir: './docs' });
  assert.equal(result.passed, true);
  assert.equal(result.errors.length, 0);
  assert.ok(result.report);
  assert.ok(result.report.summary.totalRequirements >= 7);
});

/**
 * 【テスト概要】
 * - 対象: checkDocs (CLIドキュメント整合性チェッカー)
 * - 条件: strict: true (厳格モード) を指定してドキュメント検証を実行
 * - 期待結果: テスト充足度が80%未満の高重要度(high)要件を未充足として検出し、不合格(passed: false)かつ[Strict]エラーメッセージを出力すること
 * - 関連文書: TC-0005, REQ-0005
 */
test('TC-0005: checkDocs - strictモードにおいて充足度不足の高重要度要件を検出し不合格と判定すること', () => {
  const result = checkDocs({ docsDir: './docs', strict: true });
  // In our initial set, REQ-0002 and REQ-0003 are 50% (< 80%), so strict flags them
  assert.equal(result.passed, false);
  assert.ok(result.errors.some(e => e.includes('[Strict]')));
});
