import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { MarkdownReporter } from '../../src/infrastructure/reporters/MarkdownReporter.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport と MarkdownReporter
 * - 条件: 実リポジトリ docs/ を入力
 * - 期待結果: report.subject が含まれ、マークダウン先頭に対象名が出ること
 * - 関連文書: TC-ITa-0011-01, REQ-0030, SPEC-0025
 */
test('TC-ITa-0011-01: buildTraceWeaveReport - subject がレポートとマークダウン出力に反映されること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  assert.ok(report.subject);
  assert.ok(report.subject.displayName.length > 0);
  assert.equal(report.subject.source, 'config');
  assert.equal(report.subject.displayName, 'TraceWeave');

  const markdown = MarkdownReporter.generateMarkdown(report);
  assert.ok(markdown.startsWith(`# TraceWeave 品質レポート — ${report.subject.displayName}`));
});

test('TC-ITa-0011-02: buildTraceWeaveReport - subjectOverride が自動解決より優先されること', () => {
  const { report } = buildTraceWeaveReport({
    docsDir: repositoryPath('docs'),
    useCache: false,
    subjectOverride: 'cli-override-app',
  });
  assert.equal(report.subject.displayName, 'cli-override-app');
  assert.equal(report.subject.source, 'cli');
});
