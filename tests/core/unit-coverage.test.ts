import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCoverageTable } from '../../src/core/coverage/CoverageReportLoader.js';
import { scanSourceFunctions } from '../../src/core/coverage/SourceFunctionScanner.js';
import { UnitCoverageAnalyzer } from '../../src/core/coverage/UnitCoverageAnalyzer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * 【テスト概要】
 * - 対象: CoverageReportLoader, SourceFunctionScanner, UnitCoverageAnalyzer
 * - 条件: Node テストランナーのカバレッジ表をパースし、src 配下の関数一覧と結合
 * - 期待結果: 関数カバレッジ・分岐カバレッジが 0〜1 の範囲で算出され、レポート未存在時は pending となること
 */
test('UnitCoverageAnalyzer - カバレッジレポートとソース関数一覧から単体実装カバレッジを算出できること', () => {
  const sampleTable = `
# src/core/sufficiency/SufficiencyScorer.ts | 96.15 | 84.21 | 78.57 |
# all files | 40.66 | 75.83 | 42.52 |
# end of coverage report
`;
  const parsed = parseCoverageTable(sampleTable);
  assert.ok(parsed);
  assert.equal(parsed!.summary.functionCoverage, 0.4252);
  assert.equal(parsed!.summary.branchCoverage, 0.7583);

  const functions = scanSourceFunctions(path.join(ROOT, 'src'));
  assert.ok(functions.length > 10);
  assert.ok(functions.some(fn => fn.filePath.includes('SufficiencyScorer.ts')));

  const analyzer = new UnitCoverageAnalyzer();
  const pending = analyzer.analyze({
    sourceRoot: path.join(ROOT, 'src'),
    coverageReportPath: path.join(ROOT, 'reports', 'missing-coverage.json'),
  });
  assert.equal(pending.status, 'pending');
  assert.ok(pending.totalFunctions > 0);
});
