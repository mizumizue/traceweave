import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCoverageFileDetail,
  buildLineStartOffsets,
  encodeCoverageFileKey,
  lineNumberForOffset,
  loadCoverageFileDetail,
} from '../../src/core/coverage/CoverageDetailBuilder.js';
import type { V8ScriptResult } from '../../src/core/coverage/V8CoverageAggregator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * 【テスト概要】
 * - 対象: CoverageDetailBuilder (V8 レンジから行単位カバレッジ詳細を構築)
 * - 条件: BalanceAnalyzer.ts の実ソースと V8 分岐レンジを投入
 * - 期待結果: オフセットが行番号へ変換され、未実行分岐行が uncovered / partial としてマークされること
 */
test('CoverageDetailBuilder - V8 分岐レンジから行ステータスを決定論的に構築できること', () => {
  const sourcePath = path.join(ROOT, 'src', 'core', 'analyzer', 'BalanceAnalyzer.ts');
  const source = fs.readFileSync(sourcePath, 'utf-8');
  const lineStarts = buildLineStartOffsets(source);

  assert.equal(lineNumberForOffset(lineStarts, 1983), 72);
  assert.equal(lineNumberForOffset(lineStarts, 2108), 77);

  const v8Entry: V8ScriptResult = {
    url: `file:///${sourcePath.replace(/\\/g, '/')}`,
    functions: [
      {
        functionName: 'resolveExecutedPhaseCounts',
        isBlockCoverage: true,
        ranges: [
          { startOffset: 2031, endOffset: 2055, count: 8 },
          { startOffset: 2108, endOffset: 2132, count: 0 },
        ],
      },
    ],
  };

  const detail = buildCoverageFileDetail('core/analyzer/BalanceAnalyzer.ts', source, v8Entry);
  assert.equal(detail.filePath, 'core/analyzer/BalanceAnalyzer.ts');
  assert.ok(detail.lines.length > 70);

  const line75 = detail.lines.find(line => line.lineNumber === 75);
  const line77 = detail.lines.find(line => line.lineNumber === 77);
  assert.ok(line75);
  assert.ok(line77);
  assert.equal(line75!.status, 'covered');
  assert.equal(line77!.status, 'uncovered');
  assert.equal(detail.branches.length, 2);
  assert.equal(detail.branches.some(branch => !branch.covered), true);
});

/**
 * 【テスト概要】
 * - 対象: CoverageDetailBuilder (coverage-files アーティファクトの読込)
 * - 条件: テストスイート実行後に生成された reports/coverage-files/ を参照
 * - 期待結果: 既知ファイルの JSON が存在すれば loadCoverageFileDetail で復元できること
 */
test('CoverageDetailBuilder - coverage-files アーティファクトを filePath から読み込めること', () => {
  const key = encodeCoverageFileKey('core/analyzer/BalanceAnalyzer.ts');
  const artifact = path.join(ROOT, 'reports', 'coverage-files', `${key}.json`);

  if (!fs.existsSync(artifact)) {
    test.skip('coverage-files artifact missing; run npm --prefix src test first');
  }

  const loaded = loadCoverageFileDetail(ROOT, 'core/analyzer/BalanceAnalyzer.ts');
  assert.ok(loaded);
  assert.equal(loaded!.source.filePath, 'core/analyzer/BalanceAnalyzer.ts');
  assert.ok(loaded!.source.lines.length > 0);
  assert.ok(loaded!.source.branches.length > 0);
  assert.ok(Array.isArray(loaded!.testFiles));
  assert.ok(loaded!.testFiles.some(testFile => testFile.filePath.includes('analyzer.test.ts')));
});
