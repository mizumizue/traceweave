import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: MatrixBuilder gaps.untestedRequirements
 * - 条件: 実 docs/ からレポートを生成し、superseded 要件の扱いを検証する
 * - 期待結果: REQ-0011 / REQ-0016 は未テスト警告に含まれず、REQ-0029 は MCP テストでカバーされること
 */
test('MatrixBuilder - superseded 要件を未テストギャップから除外すること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  assert.ok(!report.gaps.untestedRequirements.includes('REQ-0011'));
  assert.ok(!report.gaps.untestedRequirements.includes('REQ-0016'));
});
