import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { TestRunnerRegistry } from '../../src/core/testing/TestRunnerRegistry.js';

/**
 * 【テスト概要】
 * - 対象: DocParser & 対話型テスト実行機構
 * - 条件: parameter_file を持つテストケース (TC-0010) および外部環境依存のテストケース (TC-0004) をパース
 * - 期待結果: TC-0010 は外部JSONパラメータが自動読み込みされUI実行可能(ui_executable: true)となる一方、TC-0004 は除外判定(ui_executable: false)されること
 * - 関連文書: TC-0011, REQ-0010, SPEC-0010
 */
test('TC-0011: DocParser - parameter_file のパースと外部パラメータデータセットの自動ロードおよびUI実行可否判定ができること', () => {
  const parser = new DocParser();
  const tcPath = path.resolve('docs/test-cases/TC-0010.md');
  const node = parser.parseFile(tcPath);

  assert.ok(node, 'TC-0010 node should parse successfully');
  assert.equal(node.id, 'TC-0010');
  assert.equal(node.parameter_file, 'fixtures/test-cases/TC-0010.json');
  assert.ok(node.parameters, 'node.parameters should be automatically loaded from external json');
  assert.equal(node.parameters.testCaseId, 'TC-0010');
  assert.ok(node.parameters.patterns.length >= 5);
  assert.equal(node.ui_executable, true, 'TC-0010 should be ui_executable');
  assert.ok(node.inputAnalysis, 'node.inputAnalysis should be populated by script analyzer');
  assert.equal(node.inputAnalysis.isModifiable, true);

  const tc4Path = path.resolve('docs/test-cases/TC-0004.md');
  const node4 = parser.parseFile(tc4Path);
  assert.equal(node4?.ui_executable, false, 'TC-0004 should be excluded from UI execution (ui_executable: false)');
  assert.equal(node4?.inputAnalysis?.isModifiable, false);
  assert.equal(node4?.inputAnalysis?.reasonCode, 'external_environment_dependency');
});

/**
 * 【テスト概要】
 * - 対象: TestRunnerRegistry (ピラミッド診断ロジックのデータ駆動テスト実行)
 * - 条件: 正常なピラミッド比率の入力セット、および逆アイスクリームコーン型の入力セットを渡して runTest を実行
 * - 期待結果: 実測結果が期待値と合致し、それぞれの診断ステータス (healthy / inverted_ice_cream) が正しく判定・一致(passed)すること
 * - 関連文書: TC-0011, REQ-0010, SPEC-0010
 */
test('TC-0011: TestRunnerRegistry - テストピラミッド診断のデータ駆動テストにおいて入力に応じた診断ステータスを正しく判定できること', () => {
  // Test healthy pattern
  const healthy = TestRunnerRegistry.runTest({
    testCaseId: 'TC-0011',
    inputs: { unit: 60, integration_internal: 20, integration_external: 10, system: 5, acceptance: 2 },
    expected: { status: 'healthy', hasWarnings: false },
  });
  assert.equal(healthy.status, 'passed');
  assert.equal(healthy.isMatch, true);
  assert.equal(healthy.actual.status, 'healthy');

  // Test inverted pattern
  const inverted = TestRunnerRegistry.runTest({
    testCaseId: 'TC-0011',
    inputs: { unit: 2, integration_internal: 1, integration_external: 0, system: 15, acceptance: 30 },
    expected: { status: 'inverted_ice_cream', hasWarnings: true },
  });
  assert.equal(inverted.status, 'passed');
  assert.equal(inverted.isMatch, true);
  assert.equal(inverted.actual.status, 'inverted_ice_cream');
});
