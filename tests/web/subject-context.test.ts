import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { MarkdownReporter } from '../../src/infrastructure/reporters/MarkdownReporter.js';
import {
  formatSubjectDocumentTitle,
  formatSubjectHeaderSuffix,
} from '../../src/web/src/components/Header.js';
import { repositoryPath } from '../helpers/repo-path.js';

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

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport と MarkdownReporter
 * - 条件: 実リポジトリ docs/ を入力
 * - 期待結果: report.subject が含まれ、マークダウン先頭に対象名が出ること
 * - 関連文書: TC-ITa-0011, REQ-0030, SPEC-0025
 */
test('TC-ITa-0011: buildTraceWeaveReport - subject がレポートとマークダウン出力に反映されること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  assert.ok(report.subject);
  assert.ok(report.subject.displayName.length > 0);
  assert.equal(report.subject.source, 'config');
  assert.equal(report.subject.displayName, 'TraceWeave');

  const markdown = MarkdownReporter.generateMarkdown(report);
  assert.ok(markdown.startsWith(`# TraceWeave 品質レポート — ${report.subject.displayName}`));
});

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport（CLI 上書き）
 * - 条件: subjectOverride を指定
 * - 期待結果: 自動解決より CLI 値が優先されること
 * - 関連文書: TC-ITa-0011, REQ-0030, SPEC-0025
 */
test('TC-ITa-0011: buildTraceWeaveReport - subjectOverride が自動解決より優先されること', () => {
  const { report } = buildTraceWeaveReport({
    docsDir: repositoryPath('docs'),
    useCache: false,
    subjectOverride: 'cli-override-app',
  });
  assert.equal(report.subject.displayName, 'cli-override-app');
  assert.equal(report.subject.source, 'cli');
});
