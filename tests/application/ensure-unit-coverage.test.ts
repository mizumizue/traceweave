import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ensureUnitCoverageReport } from '../../src/application/ensure-unit-coverage.js';
import { resolveCoverageReportPath } from '../../src/core/coverage/CoverageReportLoader.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: ensureUnitCoverageReport (serve 起動時の単体カバレッジ自動生成)
 * - 条件: reports/coverage-summary.json が既に存在するリポジトリ状態
 * - 期待結果: テストスイートを再実行せず present を返すこと
 */
test('ensureUnitCoverageReport - coverage-summary.json が存在する場合は present を返すこと', () => {
  const projectRoot = repositoryPath('.');
  const coveragePath = resolveCoverageReportPath(projectRoot);
  if (!fs.existsSync(coveragePath)) {
    test.skip('coverage-summary.json is missing; run npm --prefix src test first');
    return;
  }

  const result = ensureUnitCoverageReport({ projectRoot, quiet: true });
  assert.equal(result, 'present');
});

/**
 * 【テスト概要】
 * - 対象: ensureUnitCoverageReport
 * - 条件: 存在しない projectRoot を指定
 * - 期待結果: ランナー不在として unavailable を返し、例外を投げないこと
 */
test('ensureUnitCoverageReport - ランナー不在の projectRoot では unavailable を返すこと', () => {
  const tempRoot = path.join(repositoryPath('.'), 'reports', '.ensure-unit-coverage-test');
  fs.mkdirSync(tempRoot, { recursive: true });
  try {
    const result = ensureUnitCoverageReport({ projectRoot: tempRoot, quiet: true });
    assert.equal(result, 'unavailable');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
