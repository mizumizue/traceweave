import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { TestCaseInputAnalyzer } from '../../src/core/analyzer/TestCaseInputAnalyzer.js';
import { DocNode } from '../../src/core/models/types.js';

/**
 * 【テスト概要】
 * - 対象: TestCaseInputAnalyzer (入力値変更可否判定 - Rule 0)
 * - 条件: test_case 以外の文書種別 (requirement: REQ-0001) を渡して判定を実行
 * - 期待結果: isModifiable が false、reasonCode が 'non_test_case' と判定され、Rule-0 が適用されること
 * - 関連文書: ADR-0003, REQ-0009, SPEC-0008
 */
test('TestCaseInputAnalyzer - Rule 0: test_case以外の文書種別（REQ等）は入力変更不可（non_test_case）と判定されること', () => {
  const reqNode: DocNode = {
    id: 'REQ-0001',
    kind: 'requirement',
    title: 'Sample Requirement',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };

  const analysis = TestCaseInputAnalyzer.analyze(reqNode);
  assert.equal(analysis.isModifiable, false);
  assert.equal(analysis.modifiability, 'unmodifiable');
  assert.equal(analysis.reasonCode, 'non_test_case');
  assert.equal(analysis.analysisRule, 'Rule-0: Non-TestCase Document');
});

/**
 * 【テスト概要】
 * - 対象: TestCaseInputAnalyzer (入力値変更可否判定 - Rule 1)
 * - 条件: 外部環境依存手法を持つテストケース（TC-0004: scenario/FS, TC-0006: e2e, TC-0007: manual）を判定
 * - 期待結果: 全て isModifiable が false、reasonCode が 'external_environment_dependency' と判定されること
 * - 関連文書: ADR-0003, REQ-0009, SPEC-0008
 */
test('TestCaseInputAnalyzer - Rule 1: 外部環境依存（E2E・手動・シナリオ等）を持つテストケースが入力変更不可として除外されること', () => {
  const parser = new DocParser();

  // TC-0004: scenario (storage & fs)
  const tc4 = parser.parseFile(path.resolve('docs/test-cases/TC-0004.md'));
  assert.ok(tc4);
  const analysis4 = TestCaseInputAnalyzer.analyze(tc4);
  assert.equal(analysis4.isModifiable, false);
  assert.equal(analysis4.reasonCode, 'external_environment_dependency');
  assert.ok(analysis4.analysisRule.includes('Rule-1'));
  assert.ok(analysis4.reasonDescription.includes('scenario'));

  // TC-0006: e2e (system)
  const tc6 = parser.parseFile(path.resolve('docs/test-cases/TC-0006.md'));
  assert.ok(tc6);
  const analysis6 = TestCaseInputAnalyzer.analyze(tc6);
  assert.equal(analysis6.isModifiable, false);
  assert.equal(analysis6.reasonCode, 'external_environment_dependency');
  assert.ok(analysis6.analysisRule.includes('Rule-1'));

  // TC-0007: exploratory_manual (acceptance)
  const tc7 = parser.parseFile(path.resolve('docs/test-cases/TC-0007.md'));
  assert.ok(tc7);
  const analysis7 = TestCaseInputAnalyzer.analyze(tc7);
  assert.equal(analysis7.isModifiable, false);
  assert.equal(analysis7.reasonCode, 'external_environment_dependency');
});

/**
 * 【テスト概要】
 * - 対象: TestCaseInputAnalyzer (入力値変更可否判定 - Rule 2)
 * - 条件: パラメータファイルを持たない単体テストケース（TC-0001, TC-0008）を判定
 * - 期待結果: isModifiable が false、reasonCode が 'missing_parameter_dataset' と判定されること
 * - 関連文書: ADR-0003, REQ-0009, SPEC-0008
 */
test('TestCaseInputAnalyzer - Rule 2: パラメータデータセット（parameter_file）を持たないテストケースが入力変更不可として除外されること', () => {
  const parser = new DocParser();

  // TC-0001: unit test without parameter_file
  const tc1 = parser.parseFile(path.resolve('docs/test-cases/TC-0001.md'));
  assert.ok(tc1);
  const analysis1 = TestCaseInputAnalyzer.analyze(tc1);
  assert.equal(analysis1.isModifiable, false);
  assert.equal(analysis1.reasonCode, 'missing_parameter_dataset');
  assert.ok(analysis1.analysisRule.includes('Rule-2'));
  assert.equal(analysis1.patternsCount, 0);

  // TC-0008: parser test without parameter_file
  const tc8 = parser.parseFile(path.resolve('docs/test-cases/TC-0008.md'));
  assert.ok(tc8);
  const analysis8 = TestCaseInputAnalyzer.analyze(tc8);
  assert.equal(analysis8.isModifiable, false);
  assert.equal(analysis8.reasonCode, 'missing_parameter_dataset');
});

/**
 * 【テスト概要】
 * - 対象: TestCaseInputAnalyzer (入力値変更可否判定 - Rule 4)
 * - 条件: パラメータ化された純粋計算テスト（TC-0010: 充足度計算, TC-0003: ピラミッド診断）を判定
 * - 期待結果: isModifiable が true、modifiability が 'modifiable'、Rule-4 が適用され、入力フィールドメタ情報が正しく抽出されること
 * - 関連文書: ADR-0003, REQ-0008, REQ-0009, SPEC-0008
 */
test('TestCaseInputAnalyzer - Rule 4: 単純入出力の純粋計算テスト（充足度計算・ピラミッド診断）が入力変更可能（modifiable）として認定されること', () => {
  const parser = new DocParser();

  // TC-0002 / TC-0010: Sufficiency scoring
  const tc10 = parser.parseFile(path.resolve('docs/test-cases/TC-0010.md'));
  assert.ok(tc10);
  const analysis10 = TestCaseInputAnalyzer.analyze(tc10);
  assert.equal(analysis10.isModifiable, true);
  assert.equal(analysis10.modifiability, 'modifiable');
  assert.ok(analysis10.analysisRule.includes('Rule-4'));
  assert.ok(analysis10.patternsCount >= 5);
  assert.ok(analysis10.fields.length >= 2);
  const fieldNames = analysis10.fields.map(f => f.name);
  assert.ok(fieldNames.includes('criticality'));
  assert.ok(fieldNames.includes('phaseCounts'));

  // TC-0003: Pyramid diagnostics
  const tc3 = parser.parseFile(path.resolve('docs/test-cases/TC-0003.md'));
  assert.ok(tc3);
  const analysis3 = TestCaseInputAnalyzer.analyze(tc3);
  assert.equal(analysis3.isModifiable, true);
  assert.equal(analysis3.modifiability, 'modifiable');
  assert.ok(analysis3.analysisRule.includes('Rule-4'));
});

/**
 * 【テスト概要】
 * - 対象: TestCaseInputAnalyzer (リポジトリ全体の入力変更可否一括解析および集計出力)
 * - 条件: docs/ 配下の全ドキュメントノードを一括解析し、summarize および formatText を実行
 * - 期待結果: 変更可能・不可の件数が整合し、CLIやレポート用の日本語フォーマットテキストが正しく生成されること
 * - 関連文書: ADR-0003, REQ-0009, SPEC-0009
 */
test('TestCaseInputAnalyzer - analyzeAll と summarize によりリポジトリ全体のテストケース入力変更可否サマリーが集計・フォーマット出力できること', () => {
  const parser = new DocParser();
  const nodes = parser.parseDirectory(path.resolve('docs'));
  const analyses = TestCaseInputAnalyzer.analyzeAll(nodes);
  assert.ok(analyses.length >= 13);

  const summary = TestCaseInputAnalyzer.summarize(analyses);
  assert.equal(summary.totalTestCases, analyses.length);
  assert.ok(summary.modifiableCount >= 2);
  assert.ok(summary.unmodifiableCount >= 10);
  assert.equal(summary.modifiableCount + summary.unmodifiableCount, summary.totalTestCases);

  const formattedText = TestCaseInputAnalyzer.formatText(summary);
  assert.ok(formattedText.includes('TraceWeave - テストケースUI入力値変更可否'));
  assert.ok(formattedText.includes('UI入力値変更可能'));
  assert.ok(formattedText.includes('UI入力値変更不可 (除外)'));
  assert.ok(formattedText.includes('TC-0002'));
  assert.ok(formattedText.includes('TC-0010'));
});
