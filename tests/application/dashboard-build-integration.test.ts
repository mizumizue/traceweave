import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport と CLI 静的ダッシュボード配備
 * - 条件: 実際の docs/ ディレクトリを対象に統合レポートを構築
 * - 期待結果: 全体サマリー、工程地層、マトリクス行、およびdata.json供給用ペイロードが決定論的に生成されること
 * - 関連文書: TC-0026, REQ-0004, SPEC-0005
 */
test('TC-0026: buildTraceWeaveReport - レポート統合・静的データペイロード生成およびCLI配備の外部結合検証', () => {
  const { report, graph, nodes } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });

  // 1. Validate high-level report structure
  assert.ok(report, 'Report should be generated');
  assert.ok(report.summary.totalRequirements >= 20, 'Should aggregate requirements');
  assert.ok(report.summary.totalTestCases >= 20, 'Should aggregate test cases');
  assert.ok(report.strata.length === 5, 'Should have 5 stratum levels');
  assert.ok(report.pyramid, 'Pyramid diagnostics should be included');
  assert.ok(report.gaps, 'Gap diagnostics should be included');
  assert.ok(Array.isArray(report.gaps.untestedRequirements));
  assert.ok(Array.isArray(report.gaps.missingIntegrationRequirements));
  assert.ok(Array.isArray(report.gaps.untestedSpecs));
  assert.ok(report.catalog, 'Catalog data should be included');

  // 2. Validate matrix table data integrity
  assert.ok(report.matrix.length >= 20, 'Matrix should contain rows for all requirements');
  for (const row of report.matrix) {
    assert.ok(row.requirementId.startsWith('REQ-'));
    assert.ok(row.requirementTitle.length > 0);
    assert.ok(['high', 'medium', 'low'].includes(row.criticality));
    assert.ok(typeof row.score === 'number');
    assert.ok(Array.isArray(row.specs));
    assert.ok(Array.isArray(row.allTestCases));
    assert.ok(Array.isArray(row.directTestCases));
    assert.ok(row.specs.every(spec => spec.id.startsWith('SPEC-') && spec.title.length > 0));
    assert.ok(row.allTestCases.every(testCase => testCase.id.startsWith('TC-') && testCase.title.length > 0));
  }
  const representativeRow = report.matrix.find(row => row.requirementId === 'REQ-0001');
  assert.ok(representativeRow);
  assert.ok(representativeRow.specs.length > 0);
  assert.ok(representativeRow.allTestCases.length > 0);

  // 3. Validate JSON serialization for data.json payload
  const jsonPayload = JSON.stringify(report);
  assert.ok(jsonPayload.length > 5000, 'Payload should be comprehensive');
  const parsed = JSON.parse(jsonPayload);
  assert.equal(parsed.summary.totalNeeds, report.summary.totalNeeds);
  assert.equal(parsed.matrix.length, report.matrix.length);
  assert.deepEqual(parsed.pyramid, report.pyramid);
  assert.deepEqual(parsed.gaps, report.gaps);
  assert.deepEqual(parsed.catalog, JSON.parse(JSON.stringify(report.catalog)));
  assert.equal(parsed.matrix[0].requirementId, report.matrix[0].requirementId);
  assert.ok(parsed.nodes.some((node: { id: string }) => node.id === 'REQ-0001'));

  // 4. Validate graph and nodes synchronization
  const graphReqs = graph.getRequirements();
  assert.equal(graphReqs.length, report.requirements.length);
  assert.equal(nodes.length, report.catalog?.totalCount || nodes.length);

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-build-'));
  try {
    execFileSync(
      process.execPath,
      [
        repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
        repositoryPath('src/cli/index.ts'),
        'build',
        '--docs',
        repositoryPath('docs'),
        '--out',
        outDir,
      ],
      { cwd: repositoryPath(), encoding: 'utf8' }
    );
    const generatedPayload = JSON.parse(fs.readFileSync(path.join(outDir, 'data.json'), 'utf8'));
    assert.equal(generatedPayload.matrix.length, report.matrix.length);
    assert.deepEqual(generatedPayload.pyramid, report.pyramid);
    assert.deepEqual(generatedPayload.gaps, report.gaps);
    assert.equal(generatedPayload.nodes.length, report.nodes?.length);
    assert.deepEqual(generatedPayload.summary, report.summary);
    assert.deepEqual(generatedPayload.strata, report.strata);
    assert.deepEqual(
      generatedPayload.matrix.map((row: { requirementId: string }) => row.requirementId),
      report.matrix.map(row => row.requirementId)
    );
    assert.equal(generatedPayload.catalog.totalCount, report.catalog?.totalCount);
    assert.deepEqual(generatedPayload.catalog.kindCounts, report.catalog?.kindCounts);
    assert.deepEqual(
      generatedPayload.nodes.map((node: { id: string }) => node.id),
      report.nodes?.map(node => node.id)
    );
    assert.ok(fs.existsSync(path.join(outDir, 'index.html')));
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport（システムレベル統合）
 * - 条件: 実 docs/ を入力に TraceWeaveReport 全主要フィールドを生成
 * - 期待結果: matrix と requirements の件数一致、catalog/graph が非空であること
 * - 関連文書: TC-0041, REQ-0001, REQ-0004, SPEC-0005
 */
test('TC-0041: buildTraceWeaveReport - TraceWeaveReport 統合生成がダッシュボード契約を満たすこと', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });

  assert.ok(report.summary.totalRequirements > 0);
  assert.equal(report.matrix.length, report.requirements.length);
  assert.equal(report.strata.length, 5);
  assert.ok(report.catalog && report.catalog.totalCount > 0);
  assert.ok(report.graph && report.graph.nodes.length > 0);
  assert.ok(report.graph.edges.length > 0);
});
