import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRelatedTestFiles } from '../../src/core/coverage/SourceTestFileResolver.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * 【テスト概要】
 * - 対象: SourceTestFileResolver (実装ファイルから関連テストファイルを決定論的に解決)
 * - 条件: BalanceAnalyzer.ts に対して tests/ 配下を走査
 * - 期待結果: import している analyzer.test.ts が検出されること
 */
test('SourceTestFileResolver - 実装ファイルから import 元テストを検出できること', () => {
  const matches = findRelatedTestFiles(ROOT, 'core/analyzer/BalanceAnalyzer.ts');
  assert.ok(matches.some(filePath => filePath.endsWith('tests/core/analyzer.test.ts')));
});

/**
 * 【テスト概要】
 * - 対象: SourceTestFileResolver (存在しない実装パス)
 * - 条件: テスト import が無い架空モジュール
 * - 期待結果: 空配列が返ること
 */
test('SourceTestFileResolver - 関連テストが無い実装は空配列を返すこと', () => {
  const matches = findRelatedTestFiles(ROOT, 'core/fictional/NeverImported.ts');
  assert.deepEqual(matches, []);
});
