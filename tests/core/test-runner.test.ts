import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TestRunnerRegistry } from '../../src/core/testing/TestRunnerRegistry.js';
import { TestCaseDataset } from '../../src/core/models/types.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: TestRunnerRegistry (データ駆動テストのバッチ実行)
 * - 条件: 外部フィクスチャファイル (fixtures/test-cases/TC-ITb-0007.json) から5パターン以上のデータセットをロードして runDataset を実行
 * - 期待結果: 全事前定義パターンが passed となり、failed が 0 件、実行ログとミリ秒単位の所要時間が得られること
 * - 関連文書: TC-ITb-0007, REQ-0008, SPEC-0008
 */
test('TC-ITb-0007: TestRunnerRegistry - 外部パラメータファイルからデータセットを読み込み、事前定義全パターンのバッチ実行が合格すること', () => {
  const fixturePath = repositoryPath('fixtures/test-cases/TC-ITb-0007.json');
  assert.ok(fs.existsSync(fixturePath), 'Fixture file TC-ITb-0007.json should exist');

  const dataset: TestCaseDataset = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  assert.equal(dataset.testCaseId, 'TC-ITb-0007');
  assert.ok(dataset.patterns.length >= 5, 'Should have at least 5 parameter combinations');

  // TC-ITb-0007 は UI 実行対象外のため、同一ロジックの TC-UT-0002 ハンドラでパターンを検証する
  const results = dataset.patterns.map(pattern =>
    TestRunnerRegistry.runTest({
      testCaseId: 'TC-UT-0002',
      inputs: pattern.inputs,
      expected: pattern.expected,
    })
  );
  assert.equal(results.length, dataset.patterns.length);
  assert.equal(results.filter(r => r.status === 'passed').length, dataset.patterns.length, 'All preset patterns should pass');
  assert.equal(results.filter(r => r.status !== 'passed').length, 0);

  for (const r of results) {
    assert.equal(r.status, 'passed');
    assert.equal(r.isMatch, true);
    assert.ok(typeof r.durationMs === 'number');
    assert.ok(r.logs.length > 0);
  }
});

/**
 * 【テスト概要】
 * - 対象: TestRunnerRegistry (任意パラメータでの単発実行および期待値不一致検知)
 * - 条件: 
 *   1. 期待値と実測値が一致する正常入力パラメータを投入
 *   2. 実測値(30点)と異なる誤った期待値(100点)を指定した不一致パラメータを投入
 * - 期待結果: 正常系では passed (isMatch: true) となり、不一致系では厳格に failed (isMatch: false) と判定されること
 * - 関連文書: TC-ITb-0007, REQ-0008, REQ-0009, SPEC-0008
 */
test('TC-ITb-0007: TestRunnerRegistry - 手動入力パラメータによるテスト実行と期待値不一致（mismatch）の厳格な検知ができること', () => {
  // 1. Valid custom input matching expected
  const validRun = TestRunnerRegistry.runTest({
    testCaseId: 'TC-UT-0002',
    inputs: {
      criticality: 'high',
      phaseCounts: {
        unit: 10,
        integration_internal: 5,
        integration_external: 5,
        system: 5,
        acceptance: 5,
      },
    },
    expected: {
      score: 100,
      isFullySatisfied: true,
    },
  });

  assert.equal(validRun.status, 'passed');
  assert.equal(validRun.isMatch, true);
  assert.equal(validRun.actual.score, 100);
  assert.equal(validRun.actual.isFullySatisfied, true);

  // 2. Mismatch detection (User specifies wrong expected)
  const mismatchRun = TestRunnerRegistry.runTest({
    testCaseId: 'TC-UT-0002',
    inputs: {
      criticality: 'high',
      phaseCounts: { unit: 1, integration_internal: 0, integration_external: 0, system: 0, acceptance: 0 },
    },
    expected: {
      score: 100, // actual will be 0 (unit excluded from traceability scoring)
    },
  });

  assert.equal(mismatchRun.status, 'failed');
  assert.equal(mismatchRun.isMatch, false);
  assert.equal(mismatchRun.actual.score, 0);
});

/**
 * 【テスト概要】
 * - 対象: TestRunnerRegistry (UI実行可否フィルタリングおよび非単純I/Oテストの除外保護)
 * - 条件: 純粋計算テスト(TC-ITb-0007, TC-ITb-0008等)と外部環境依存テスト(TC-ITb-0002, TC-ITb-0003等)の実行可否を確認し、除外テストの実行を試行
 * - 期待結果: 純粋計算テストのみ isExecutable: true となり、除外テストは実行拒否 (status: 'error') されること
 * - 関連文書: TC-ITb-0007, REQ-0008, REQ-0009, SPEC-0008
 */
test('TC-ITb-0007: TestRunnerRegistry - 外部環境依存テスト（非単純I/O）のUI実行除外および不一致検知が正しく行われること', () => {
  // 1. Pure calculation tests are executable
  assert.equal(TestRunnerRegistry.has('TC-ITb-0007'), false, 'TC-ITb-0007 has external parameter_file and is excluded from UI');
  assert.equal(TestRunnerRegistry.has('TC-ITb-0008'), true);
  assert.equal(TestRunnerRegistry.has('TC-UT-0002'), true);
  assert.equal(TestRunnerRegistry.has('TC-ITb-0001'), true);

  // 2. Integration / E2E / CLI tests requiring external env are excluded from UI execution
  assert.equal(TestRunnerRegistry.has('TC-ITb-0002'), false, 'Storage test must be excluded from UI execution');
  assert.equal(TestRunnerRegistry.has('TC-ITb-0003'), false, 'CLI test must be excluded from UI execution');
  assert.equal(TestRunnerRegistry.has('TC-ITb-0004'), false, 'Build test must be excluded from UI execution');
  assert.equal(TestRunnerRegistry.has('TC-UAT-0001'), false, 'Dogfooding test must be excluded from UI execution');
  assert.equal(TestRunnerRegistry.has('UNKNOWN-TC'), false);

  // 3. Attempting to run excluded test returns status: 'error' with clear exclusion reason
  const excludedRun = TestRunnerRegistry.runTest({
    testCaseId: 'TC-ITb-0002',
    inputs: { test: true },
    expected: { success: true },
  });
  assert.equal(excludedRun.status, 'error');
  assert.equal(excludedRun.isMatch, false);
  assert.ok(excludedRun.error?.includes('UI実行に対応していません'));

  // 4. Mismatch detection on executable test case (TC-ITb-0008)
  const mismatchRun = TestRunnerRegistry.runTest({
    testCaseId: 'TC-ITb-0008',
    inputs: { unit: 2, integration_internal: 0, integration_external: 0, system: 10, acceptance: 30 },
    expected: { status: 'healthy', hasWarnings: false }, // actual is inverted_ice_cream
  });
  assert.equal(mismatchRun.status, 'failed');
  assert.equal(mismatchRun.isMatch, false);
});
