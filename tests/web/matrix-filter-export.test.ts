import test from 'node:test';
import assert from 'node:assert/strict';
import { MatrixRow } from '../../src/core/models/types.js';
import {
  filterMatrixRows,
  serializeMatrixCsv,
  serializeMatrixJson,
  serializeMatrixMarkdown,
} from '../../src/web/src/utils/matrixData.js';

/**
 * 【テスト概要】
 * - 対象: filterMatrixRows（多軸フィルター：重要度、工程、充足度ステータス、検索キーワード判定ロジック）
 * - 条件: 複数要件のMatrixRow配列に対し、重要度('high')、工程('unit')、ステータス('unsatisfied')、検索語の複合絞り込みを実行
 * - 期待結果: 条件を満たす行のみが正確に抽出されること
 * - 関連文書: TC-0023
 */
test('TC-0023: filterMatrixRows - 重要度・工程・充足度ステータス・キーワードの複合フィルター判定が正確に行われること', () => {
  const sampleRows: MatrixRow[] = [
    {
      requirementId: 'REQ-0001',
      requirementTitle: 'トレーサビリティマトリクス閲覧',
      criticality: 'high',
      score: 40,
      isFullySatisfied: false,
      specs: [{ id: 'SPEC-0001', title: 'マトリクス仕様' }],
      testCasesByPhase: {
        unit: [{ id: 'TC-0001', title: 'UT', level: 'unit', method: 'unit_mock', status: 'passed' }],
        integration_internal: [],
        integration_external: [],
        system: [],
        acceptance: [],
      },
      allTestCases: [{ id: 'TC-0001', title: 'UT', level: 'unit', method: 'unit_mock', status: 'passed' }],
    },
    {
      requirementId: 'REQ-0002',
      requirementTitle: '充足度スコアリング',
      criticality: 'high',
      score: 100,
      isFullySatisfied: true,
      specs: [{ id: 'SPEC-0003', title: 'スコア仕様' }],
      testCasesByPhase: {
        unit: [{ id: 'TC-0002', title: 'UT2', level: 'unit', method: 'property_based', status: 'passed' }],
        integration_internal: [{ id: 'TC-0025', title: 'ITa', level: 'integration_internal', method: 'scenario', status: 'passed' }],
        integration_external: [],
        system: [],
        acceptance: [],
      },
      allTestCases: [
        { id: 'TC-0002', title: 'UT2', level: 'unit', method: 'property_based', status: 'passed' },
        { id: 'TC-0025', title: 'ITa', level: 'integration_internal', method: 'scenario', status: 'passed' },
      ],
    },
    {
      requirementId: 'REQ-0010',
      requirementTitle: '円形ゲージ表示',
      criticality: 'medium',
      score: 100,
      isFullySatisfied: true,
      specs: [{ id: 'SPEC-0010', title: 'ゲージ仕様' }],
      testCasesByPhase: {
        unit: [{ id: 'TC-0012', title: 'UT', level: 'unit', method: 'unit_mock', status: 'passed' }],
        integration_internal: [],
        integration_external: [],
        system: [],
        acceptance: [],
      },
      allTestCases: [{ id: 'TC-0012', title: 'UT', level: 'unit', method: 'unit_mock', status: 'passed' }],
    },
  ];

  // Test 1: Filter criticality high
  const highRows = filterMatrixRows(sampleRows, { criticality: 'high' });
  assert.equal(highRows.length, 2);
  assert.deepEqual(highRows.map(r => r.requirementId), ['REQ-0001', 'REQ-0002']);

  // Test 2: Filter phase integration_internal
  const itInternalRows = filterMatrixRows(sampleRows, { phase: 'integration_internal' });
  assert.equal(itInternalRows.length, 1);
  assert.equal(itInternalRows[0].requirementId, 'REQ-0002');

  // Test 3: Filter unsatisfied
  const unsatisfiedRows = filterMatrixRows(sampleRows, { score: 'unsatisfied' });
  assert.equal(unsatisfiedRows.length, 1);
  assert.equal(unsatisfiedRows[0].requirementId, 'REQ-0001');

  // Test 4: Search query
  const queryRows = filterMatrixRows(sampleRows, { searchQuery: 'SPEC-0010' });
  assert.equal(queryRows.length, 1);
  assert.equal(queryRows[0].requirementId, 'REQ-0010');
});

/**
 * 【テスト概要】
 * - 対象: serializeMatrixCsv / serializeMatrixJson / serializeMatrixMarkdown（CSV, JSON, Markdown シリアライズ）
 * - 条件: MatrixRow配列からCSVヘッダー/行、JSON文字列、Markdownテーブルを生成
 * - 期待結果: 各フォーマットの出力文字列がスキーマ仕様通りに整合していること
 * - 関連文書: TC-0023
 */
test('TC-0023: matrixData - トレーサビリティデータのCSV・JSON・Markdownシリアライズが正確に行われること', () => {
  const sampleRows: MatrixRow[] = [
    {
      requirementId: 'REQ-0015',
      requirementTitle: 'マトリクス表の多軸フィルターおよびデータエクスポート',
      criticality: 'medium',
      score: 100,
      isFullySatisfied: true,
      specs: [{ id: 'SPEC-0015', title: 'エクスポート仕様' }],
      testCasesByPhase: {
        unit: [{ id: 'TC-0023', title: 'UT', level: 'unit', method: 'unit_mock', status: 'passed' }],
        integration_internal: [],
        integration_external: [],
        system: [],
        acceptance: [],
      },
      allTestCases: [{ id: 'TC-0023', title: 'UT', level: 'unit', method: 'unit_mock', status: 'passed' }],
    },
  ];

  // 1. CSV Generation
  const fullCsv = serializeMatrixCsv(sampleRows);

  assert.equal(fullCsv.split('\n')[0], 'Need ID,Requirement ID,Requirement Title,Class,Criticality,Score,Specs,Test Cases');
  assert.equal(fullCsv.split('\n').length, 2);
  assert.equal(
    fullCsv.split('\n')[1],
    '"","REQ-0015","マトリクス表の多軸フィルターおよびデータエクスポート","","medium","100%","SPEC-0015","TC-0023(unit)"'
  );
  assert.ok(fullCsv.includes('"REQ-0015"'));
  assert.ok(fullCsv.includes('"SPEC-0015"'));
  assert.ok(fullCsv.includes('"TC-0023(unit)"'));

  // 2. JSON Generation
  const jsonOutput = serializeMatrixJson(sampleRows);
  const parsed = JSON.parse(jsonOutput);
  assert.deepEqual(parsed, sampleRows);

  // 3. Markdown Generation
  const fullMd = serializeMatrixMarkdown(sampleRows);

  assert.ok(fullMd.startsWith('| Requirement | Class | Criticality | Score | Specs | Tests |\n|---|---|---|---|---|---|\n'));
  assert.ok(fullMd.includes('| **REQ-0015**: マトリクス表の多軸フィルターおよびデータエクスポート | - | medium | 100% | `SPEC-0015` | `TC-0023` |'));
});
