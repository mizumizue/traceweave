import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTestResultsReports } from '../../src/core/workspace/merge-test-results.js';
import { TestResultsReport } from '../../src/core/models/types.js';

/**
 * 【テスト概要】
 * - 対象: mergeTestResultsReports（ワークスペース証跡マージ）
 * - 条件: 2 つの部分レポートが同一 TC ID で異なるステータス
 * - 期待結果: fail-wins では failed が優先されること
 */
test('mergeTestResultsReports - fail-wins で failed が passed より優先されること', () => {
  const a: TestResultsReport = {
    generatedAt: '2026-01-01T00:00:00.000Z',
    totalTests: 1,
    passedCount: 1,
    failedCount: 0,
    skippedCount: 0,
    results: {
      'TC-0001': {
        testCaseId: 'TC-0001',
        status: 'passed',
        durationMs: 1,
        testTitle: 'TC-0001: ok',
        executedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  };
  const b: TestResultsReport = {
    generatedAt: '2026-01-02T00:00:00.000Z',
    totalTests: 1,
    passedCount: 0,
    failedCount: 1,
    skippedCount: 0,
    results: {
      'TC-0001': {
        testCaseId: 'TC-0001',
        status: 'failed',
        durationMs: 2,
        testTitle: 'TC-0001: bad',
        executedAt: '2026-01-02T00:00:00.000Z',
      },
    },
  };

  const merged = mergeTestResultsReports([a, b], 'fail-wins');
  assert.equal(merged.results['TC-0001'].status, 'failed');
  assert.equal(merged.failedCount, 1);
});
