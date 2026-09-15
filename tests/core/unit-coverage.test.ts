import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCoverageSummaryFromLcov,
  parseLcov,
} from '../../src/core/coverage/LcovParser.js';
import { UnitCoverageAnalyzer } from '../../src/core/coverage/UnitCoverageAnalyzer.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * 【テスト概要】
 * - 対象: LcovParser, UnitCoverageAnalyzer
 * - 条件: サンプル LCOV レコードと coverage-summary.json 欠落状態
 * - 期待結果: LCOV から関数・分岐・行カバレッジが 0〜1 で算出され、レポート未存在時は pending となること
 */
test('UnitCoverageAnalyzer - LCOV と coverage-summary から単体実装カバレッジを算出できること', () => {
  const sampleLcov = `
TN:
SF:src/core/sufficiency/SufficiencyScorer.ts
FN:10,score
FN:20,helper
FNDA:5,score
FNDA:0,helper
FNF:2
FNH:1
BRDA:12,0,0,1
BRDA:12,0,1,0
BRF:2
BRH:1
DA:10,5
DA:20,0
LF:2
LH:1
end_of_record
TN:
SF:src/core/analyzer/BalanceAnalyzer.ts
FN:1,analyze
FNDA:3,analyze
FNF:1
FNH:1
DA:1,3
LF:1
LH:1
end_of_record
`;

  const records = parseLcov(sampleLcov);
  assert.equal(records.length, 2);

  const summary = buildCoverageSummaryFromLcov(records);
  assert.ok(summary.summary.functionCoverage > 0);
  assert.ok(summary.summary.branchCoverage > 0);
  assert.equal(summary.files.length, 2);

  const analyzer = new UnitCoverageAnalyzer();
  const pending = analyzer.analyze({
    projectRoot: ROOT,
    coverageReportPath: path.join(ROOT, 'reports', 'missing-coverage.json'),
  });
  assert.equal(pending.status, 'pending');
  assert.equal(pending.totalFunctions, 0);
});
