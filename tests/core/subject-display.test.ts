import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSubjectDocumentTitle,
  formatSubjectHeaderSuffix,
} from '../../src/web/src/components/Header.js';

/**
 * 【テスト概要】
 * - 対象: Web ヘッダー・document.title 用フォーマット関数
 * - 条件: 表示名 my-app を入力
 * - 期待結果: SPEC-0025 の表示フォーマット契約を満たすこと
 * - 関連文書: TC-UT-0017, REQ-0030, SPEC-0025, SPEC-0020
 */
test('TC-UT-0017: subject 表示フォーマット - ヘッダー接尾辞とブラウザタイトルが契約どおりであること', () => {
  assert.equal(formatSubjectHeaderSuffix('my-app'), 'for my-app');
  assert.equal(formatSubjectDocumentTitle('my-app'), 'TraceWeave — my-app');
});
