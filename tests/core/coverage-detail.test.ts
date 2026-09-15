import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCoverageFileDetail,
  encodeCoverageFileKey,
  loadCoverageFileDetail,
} from '../../src/core/coverage/CoverageDetailBuilder.js';
import { parseLcov } from '../../src/core/coverage/LcovParser.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * 【テスト概要】
 * - 対象: CoverageDetailBuilder (LCOV 行・分岐データから行単位カバレッジ詳細を構築)
 * - 条件: BalanceAnalyzer.ts の実ソースと LCOV DA/BRDA レコードを投入
 * - 期待結果: 実行済み行が covered、未実行行が uncovered、分岐行が partial としてマークされること
 */
test('CoverageDetailBuilder - LCOV 行・分岐データから行ステータスを決定論的に構築できること', () => {
  const sourcePath = path.join(ROOT, 'src', 'core', 'analyzer', 'BalanceAnalyzer.ts');
  const source = fs.readFileSync(sourcePath, 'utf-8');
  const sampleLcov = `
SF:${sourcePath.replace(/\\/g, '/')}
FN:72,resolveExecutedPhaseCounts
FNDA:8,resolveExecutedPhaseCounts
FNF:1
FNH:1
BRDA:75,0,0,8
BRDA:77,0,1,0
BRF:2
BRH:1
DA:75,8
DA:77,0
LF:2
LH:1
end_of_record
`;

  const record = parseLcov(sampleLcov)[0];
  assert.ok(record);

  const detail = buildCoverageFileDetail('core/analyzer/BalanceAnalyzer.ts', source, record);
  assert.equal(detail.filePath, 'core/analyzer/BalanceAnalyzer.ts');
  assert.ok(detail.lines.length > 70);

  const line75 = detail.lines.find(line => line.lineNumber === 75);
  const line77 = detail.lines.find(line => line.lineNumber === 77);
  assert.ok(line75);
  assert.ok(line77);
  assert.equal(line75!.status, 'covered');
  assert.equal(line77!.status, 'uncovered');
  assert.ok(detail.branches.length > 0);
  assert.equal(detail.branches.some(branch => !branch.covered), true);
});

/**
 * 【テスト概要】
 * - 対象: CoverageDetailBuilder (coverage-files アーティファクトの読込)
 * - 条件: test:coverage 実行後に生成された reports/coverage-files/ を参照
 * - 期待結果: 既知ファイルの JSON が存在すれば loadCoverageFileDetail で復元できること
 */
test('CoverageDetailBuilder - coverage-files アーティファクトを filePath から読み込めること', () => {
  const key = encodeCoverageFileKey('core/analyzer/BalanceAnalyzer.ts');
  const artifact = path.join(ROOT, 'reports', 'coverage-files', `${key}.json`);

  if (!fs.existsSync(artifact)) {
    test.skip('coverage-files artifact missing; run npm --prefix src run test:coverage first');
  }

  const loaded = loadCoverageFileDetail(ROOT, 'core/analyzer/BalanceAnalyzer.ts');
  assert.ok(loaded);
  assert.equal(loaded!.source.filePath, 'core/analyzer/BalanceAnalyzer.ts');
  assert.ok(loaded!.source.lines.length > 0);
  assert.ok(loaded!.source.branches.length > 0);
  assert.ok(Array.isArray(loaded!.testFiles));
  assert.ok(loaded!.testFiles.some(testFile => testFile.filePath.includes('analyzer.test.ts')));
});
