import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { TestReportLoader } from '../../src/infrastructure/testing/TestReportLoader.js';
import { isPathInsideRoot, resolveRepoRoot } from '../../src/infrastructure/system/resolveRepoRoot.js';
import { repositoryPath, repositoryRoot } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: resolveRepoRoot / isPathInsideRoot
 * - 条件: ソース配置・コンパイル配置の module URL からルート解決し、パストラバーサル判定を行う
 * - 期待結果: 実リポジトリルートが返り、distWeb 外のパスは拒否されること
 */
test('resolveRepoRoot - ソースおよび dist 配置から同一のリポジトリルートを解決できること', () => {
  const fromBuildReport = resolveRepoRoot(pathToFileURL(repositoryPath('src/application/build-report.ts')).href);
  const fromCompiled = resolveRepoRoot(pathToFileURL(repositoryPath('src/dist/application/build-report.js')).href);
  const fromTestLoader = resolveRepoRoot(
    pathToFileURL(repositoryPath('src/infrastructure/testing/TestReportLoader.ts')).href
  );

  assert.equal(fromBuildReport, repositoryRoot);
  assert.equal(fromCompiled, repositoryRoot);
  assert.equal(fromTestLoader, repositoryRoot);
});

test('resolveRepoRoot - buildTraceWeaveReport がコンパイル経路でも docs/ を正しく参照できること', () => {
  const compiledUrl = pathToFileURL(repositoryPath('src/dist/application/build-report.js')).href;
  const { nodes } = buildTraceWeaveReport({
    docsDir: path.join(resolveRepoRoot(compiledUrl), 'docs'),
    useCache: false,
    loadTestReport: false,
  });
  assert.ok(nodes.length > 0, 'compiled path resolution should load repository docs');
});

test('resolveRepoRoot - TestReportLoader が reports/test-results.json をリポジトリルート基準で参照できること', () => {
  const report = TestReportLoader.loadReport();
  assert.ok(report, 'test report should be discoverable from repository root');
});

test('isPathInsideRoot - distWeb 外へのパストラバーサル要求を拒否できること', () => {
  const distWeb = repositoryPath('src/web/dist');
  const escaped = path.resolve(distWeb, '..', 'package.json');
  assert.equal(isPathInsideRoot(distWeb, escaped), false);
  assert.equal(isPathInsideRoot(distWeb, path.join(distWeb, 'index.html')), true);
});
