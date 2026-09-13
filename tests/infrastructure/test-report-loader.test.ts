import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DocNode, TestResultsReport } from '../../src/core/models/types.js';
import { TestReportLoader } from '../../src/infrastructure/testing/TestReportLoader.js';

/**
 * 【テスト概要】
 * - 対象: TestReportLoader (テスト結果レポートローダー)
 * - 条件: 構造化されたテストレポートJSONが存在し、該当するTC-IDのノードと未実行のTC-IDのノードをマージ
 * - 期待結果: 該当TC-IDは status/actual_result/evidence_log/durationMs が動的に注入され、未実行TC-IDは pending に維持されること
 * - 関連文書: TC-0008, REQ-0007, SPEC-0006, ADR-0006
 */
test('TestReportLoader - テスト結果レポートからTCノードへ動的に合否ステータス・実測値・生ログ証跡がマージされること', () => {
  const mockReport: TestResultsReport = {
    generatedAt: new Date().toISOString(),
    totalTests: 2,
    passedCount: 1,
    failedCount: 1,
    skippedCount: 0,
    results: {
      'TC-0001': {
        testCaseId: 'TC-0001',
        status: 'passed',
        durationMs: 42.5,
        testTitle: 'TC-0001: TraceGraph - 有向グラフ構築単体テスト',
        outputLog: 'ok 1 - TC-0001 passed\nduration_ms: 42.5',
        executedAt: new Date().toISOString(),
      },
      'TC-0002': {
        testCaseId: 'TC-0002',
        status: 'failed',
        durationMs: 15.2,
        testTitle: 'TC-0002: SufficiencyScorer - 充足度計算テスト',
        errorMessage: 'AssertionError: expected 100 to equal 50',
        errorStack: 'AssertionError: expected 100 to equal 50\n  at suff.test.ts:45',
        outputLog: 'not ok 2 - TC-0002 failed',
        executedAt: new Date().toISOString(),
      },
    },
  };

  const nodes: DocNode[] = [
    {
      id: 'TC-0001',
      kind: 'test_case',
      title: 'TC 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-13',
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: 'test',
    },
    {
      id: 'TC-0002',
      kind: 'test_case',
      title: 'TC 2',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-13',
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: 'test',
    },
    {
      id: 'TC-0003',
      kind: 'test_case',
      title: 'TC 3 (未実行)',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-13',
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: 'test',
    },
  ];

  const merged = TestReportLoader.mergeReportIntoNodes(nodes, mockReport);

  // TC-0001 (passed) の検証
  const tc1 = merged.find(n => n.id === 'TC-0001')!;
  assert.equal(tc1.execution_status, 'passed');
  assert.equal(tc1.execution_duration_ms, 42.5);
  assert.ok(tc1.actual_result?.includes('検証合格 (Passed)'));
  assert.ok(tc1.evidence_log?.includes('ok 1 - TC-0001 passed'));

  // TC-0002 (failed) の検証
  const tc2 = merged.find(n => n.id === 'TC-0002')!;
  assert.equal(tc2.execution_status, 'failed');
  assert.equal(tc2.execution_duration_ms, 15.2);
  assert.ok(tc2.actual_result?.includes('AssertionError'));
  assert.ok(tc2.evidence_log?.includes('not ok 2'));

  // TC-0003 (未実行) の検証
  const tc3 = merged.find(n => n.id === 'TC-0003')!;
  assert.equal(tc3.execution_status, 'pending');
  assert.equal(tc3.actual_result, undefined);
  assert.equal(tc3.evidence_log, undefined);
  assert.equal(tc3.execution_duration_ms, undefined);
});

/**
 * 【テスト概要】
 * - 対象: TestReportLoader (レポート非存在時のフォールバック)
 * - 条件: report が null の状態で mergeReportIntoNodes を実行
 * - 期待結果: すべての test_case ノードの execution_status が pending となり、偽装値を持たないこと
 * - 関連文書: TC-0008, REQ-0007, ADR-0006
 */
test('TestReportLoader - レポート非存在時に全テストケースが pending となり過去の結果で偽装されないこと', () => {
  const nodes: DocNode[] = [
    {
      id: 'TC-0001',
      kind: 'test_case',
      title: 'TC 1',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-13',
      scope: 'local',
      depends_on: [],
      tags: [],
      links: [],
      content: 'test',
    },
  ];

  const merged = TestReportLoader.mergeReportIntoNodes(nodes, null);
  assert.equal(merged[0].execution_status, 'pending');
  assert.equal(merged[0].actual_result, undefined);
  assert.equal(merged[0].evidence_log, undefined);
});
