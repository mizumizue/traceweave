import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { TestCaseInputAnalyzer } from '../../src/core/analyzer/TestCaseInputAnalyzer.js';
import { DocNode } from '../../src/core/models/types.js';
import { repositoryPath } from '../helpers/repo-path.js';

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
  const tc4 = parser.parseFile(repositoryPath('docs/test-cases/TC-0004.md'));
  assert.ok(tc4);
  const analysis4 = TestCaseInputAnalyzer.analyze(tc4);
  assert.equal(analysis4.isModifiable, false);
  assert.equal(analysis4.reasonCode, 'external_environment_dependency');
  assert.ok(analysis4.analysisRule.includes('Rule-1'));
  assert.ok(analysis4.reasonDescription.includes('scenario'));

  // TC-0006: e2e (system)
  const tc6 = parser.parseFile(repositoryPath('docs/test-cases/TC-0006.md'));
  assert.ok(tc6);
  const analysis6 = TestCaseInputAnalyzer.analyze(tc6);
  assert.equal(analysis6.isModifiable, false);
  assert.equal(analysis6.reasonCode, 'external_environment_dependency');
  assert.ok(analysis6.analysisRule.includes('Rule-1'));

  // TC-0007: exploratory_manual (acceptance)
  const tc7 = parser.parseFile(repositoryPath('docs/test-cases/TC-0007.md'));
  assert.ok(tc7);
  const analysis7 = TestCaseInputAnalyzer.analyze(tc7);
  assert.equal(analysis7.isModifiable, false);
  assert.equal(analysis7.reasonCode, 'external_environment_dependency');
});

/**
 * 【テスト概要】
 * - 対象: TestCaseInputAnalyzer (入力値変更可否判定 - Rule 2)
 * - 条件: パラメータファイルを持たない単体テストケース（TC-0001, TC-0012）を判定
 * - 期待結果: isModifiable が false、reasonCode が 'missing_parameter_dataset' と判定されること
 * - 関連文書: ADR-0003, REQ-0009, SPEC-0008
 */
test('TestCaseInputAnalyzer - Rule 2: パラメータデータセット（parameter_file）を持たないテストケースが入力変更不可として除外されること', () => {
  const parser = new DocParser();

  // TC-0001: unit test without parameter_file
  const tc1 = parser.parseFile(repositoryPath('docs/test-cases/TC-0001.md'));
  assert.ok(tc1);
  const analysis1 = TestCaseInputAnalyzer.analyze(tc1);
  assert.equal(analysis1.isModifiable, false);
  assert.equal(analysis1.reasonCode, 'missing_parameter_dataset');
  assert.ok(analysis1.analysisRule.includes('Rule-2'));
  assert.equal(analysis1.patternsCount, 0);

  // TC-0012: circular gauge unit test without parameter_file
  const tc12 = parser.parseFile(repositoryPath('docs/test-cases/TC-0012.md'));
  assert.ok(tc12);
  const analysis12 = TestCaseInputAnalyzer.analyze(tc12);
  assert.equal(analysis12.isModifiable, false);
  assert.equal(analysis12.reasonCode, 'missing_parameter_dataset');
});

/**
 * 【テスト概要】
 * - 対象: TestCaseInputAnalyzer (入力値変更可否判定 - Rule 4)
 * - 条件: パラメータ化された純粋計算テスト（TC-0002: 充足度計算）を判定
 * - 期待結果: isModifiable が true、modifiability が 'modifiable'、Rule-4 が適用され、入力フィールドメタ情報が正しく抽出されること
 * - 関連文書: ADR-0003, REQ-0008, REQ-0009, SPEC-0008
 */
test('TestCaseInputAnalyzer - Rule 4: 単純入出力の充足度計算テストが入力変更可能（modifiable）として認定されること', () => {
  const parser = new DocParser();

  // TC-0002-style pure calculation input (kept in memory so this unit test
  // does not inherit the external fixture boundary).
  const tc2: DocNode = {
    id: 'TC-0002',
    kind: 'test_case',
    title: 'Sufficiency scoring',
    status: 'accepted',
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local',
    test_level: 'unit',
    test_method: 'unit_mock',
    parameter_file: 'inline',
    parameters: {
      testCaseId: 'TC-0002',
      name: 'Sufficiency scoring',
      patterns: [
        {
          name: 'high',
          inputs: {
            criticality: 'high',
            phaseCounts: { unit: 1, integration_internal: 0, integration_external: 0, system: 0, acceptance: 0 },
          },
          expected: { score: 30 },
        },
      ],
    },
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };
  const analysis2 = TestCaseInputAnalyzer.analyze(tc2);
  assert.equal(analysis2.isModifiable, true);
  assert.equal(analysis2.modifiability, 'modifiable');
  assert.ok(analysis2.analysisRule.includes('Rule-4'));
  assert.equal(analysis2.patternsCount, 1);
  assert.ok(analysis2.fields.length >= 2);
  const fieldNames = analysis2.fields.map(f => f.name);
  assert.ok(fieldNames.includes('criticality'));
  assert.ok(fieldNames.includes('phaseCounts'));
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
  const nodes = parser.parseDirectory(repositoryPath('docs'));
  const analyses = TestCaseInputAnalyzer.analyzeAll(nodes);
  assert.ok(analyses.length >= 13);

  const summary = TestCaseInputAnalyzer.summarize(analyses);
  assert.equal(summary.totalTestCases, analyses.length);
  assert.ok(summary.modifiableCount >= 1);
  assert.ok(summary.unmodifiableCount >= 10);
  assert.equal(summary.modifiableCount + summary.unmodifiableCount, summary.totalTestCases);

  const formattedText = TestCaseInputAnalyzer.formatText(summary);
  assert.ok(formattedText.includes('TraceWeave - テストケースUI入力値変更可否'));
  assert.ok(formattedText.includes('UI入力値変更可能'));
  assert.ok(formattedText.includes('UI入力値変更不可'));
  assert.ok(formattedText.includes('TC-0002'));
  assert.ok(formattedText.includes('TC-0010'));
});
