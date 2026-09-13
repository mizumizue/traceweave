import test from 'node:test';
import assert from 'node:assert/strict';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { DecisionsCatalogBuilder } from '../../src/core/decisions/DecisionsCatalogBuilder.js';
import { ConsoleReporter } from '../../src/infrastructure/reporters/ConsoleReporter.js';
import { repositoryPath } from '../helpers/repo-path.js';
import { execFileSync } from 'node:child_process';

/**
 * 【テスト概要】
 * - 対象: DocParser & DecisionsCatalogBuilder & ConsoleReporter（実ドキュメントのカタログ集約・相互参照解決・CLI出力）
 * - 条件: 実際の docs/ ディレクトリをパースし、DecisionsCatalogBuilder による相互参照解決・集計・フィルタリングを実行
 * - 期待結果: 主要種別のドキュメントが集約され、ACT-UC逆引きやDSN-ADR双方向リンクが解決され、種別フィルターが正しく適用されること
 * - 関連文書: TC-0031, REQ-0017, REQ-0018, REQ-0019, SPEC-0017
 */
test('TC-0031: DecisionsCatalogBuilder - 主要種別集約・相互参照（ACT-UC/DSN-ADR）解決およびCLIフィルタリングの外部結合検証', () => {
  const parser = new DocParser();
  const nodes = parser.parseDirectory(repositoryPath('docs'));

  // 1. Build decisions catalog
  const catalog = DecisionsCatalogBuilder.build(nodes);
  assert.ok(catalog.totalCount >= 90, 'Catalog should aggregate all documents');
  assert.ok(catalog.kindCounts.actor > 0, 'Should aggregate actors');
  assert.ok(catalog.kindCounts.use_case > 0, 'Should aggregate use cases');
  assert.ok(catalog.kindCounts.requirement > 0, 'Should aggregate requirements');
  assert.ok(catalog.kindCounts.specification > 0, 'Should aggregate specifications');
  assert.ok(catalog.kindCounts.decision > 0, 'Should aggregate decisions (ADR)');
  assert.ok(catalog.kindCounts.design > 0, 'Should aggregate designs (DSN)');

  // 2. Validate bidirectional cross references
  // Actor <-> UseCase
  const actorsWithUC = catalog.items.filter(i => i.kind === 'actor' && i.relatedUseCases && i.relatedUseCases.length > 0);
  assert.ok(actorsWithUC.length > 0, 'At least one actor must have reverse-referenced use cases');
  assert.deepEqual(
    catalog.items.find(i => i.id === 'ACT-0001')?.relatedUseCases?.map(i => i.id).sort(),
    ['UC-0001', 'UC-0002', 'UC-0003', 'UC-0004', 'UC-0005', 'UC-0006', 'UC-0007', 'UC-0008', 'UC-0009']
  );
  const useCasesWithRefs = catalog.items.filter(
    i => i.kind === 'use_case' && (i.relatedActors?.length || 0) > 0 && (i.relatedReqs?.length || 0) > 0
  );
  assert.ok(useCasesWithRefs.length > 0, 'At least one use case must resolve actors and requirements');
  assert.deepEqual(
    catalog.items.find(i => i.id === 'UC-0001')?.relatedActors?.map(i => i.id),
    ['ACT-0001', 'ACT-0002']
  );

  // Design <-> Decision
  const designsWithADR = catalog.items.filter(i => i.kind === 'design' && i.relatedDecisions && i.relatedDecisions.length > 0);
  assert.ok(designsWithADR.length > 0, 'At least one design must have related ADR decisions');
  assert.deepEqual(
    catalog.items.find(i => i.id === 'DSN-0001')?.relatedDecisions?.map(i => i.id),
    ['ADR-0002']
  );
  const decisionsWithDesign = catalog.items.filter(
    i => i.kind === 'decision' && i.relatedDesigns && i.relatedDesigns.length > 0
  );
  assert.ok(decisionsWithDesign.length > 0, 'At least one decision must have related designs');
  assert.deepEqual(
    catalog.items.find(i => i.id === 'ADR-0002')?.relatedDesigns?.map(i => i.id),
    ['DSN-0001']
  );

  // 3. Test filtering by kind
  const adrItems = DecisionsCatalogBuilder.filter(catalog, { kind: 'decision' });
  assert.equal(adrItems.length, catalog.kindCounts.decision);
  for (const item of adrItems) {
    assert.equal(item.kind, 'decision');
  }

  // 4. Test filtering by query
  const queryItems = DecisionsCatalogBuilder.filter(catalog, { query: 'matrix' });
  assert.ok(queryItems.length > 0, 'Query should return matching items');
  assert.deepEqual(queryItems.map(item => item.id).sort(), [
    'DSN-0003',
    'DSN-0004',
    'DSN-0008',
    'DSN-0012',
    'DSN-0013',
    'DSN-0016',
    'DSN-0017',
    'DSN-0018',
    'NEED-0008',
    'NEED-0009',
    'REQ-0005',
    'REQ-0015',
    'REQ-0016',
    'REQ-0023',
    'REQ-0027',
    'REQ-0028',
    'SPEC-0004',
    'SPEC-0005',
    'SPEC-0015',
    'SPEC-0019',
    'SPEC-0020',
    'SPEC-0021',
    'TC-0006',
    'TC-0020',
    'TC-0023',
    'TC-0026',
    'TC-0031',
    'TC-0035',
    'UC-0001',
    'UC-0003',
  ].sort());
  for (const item of queryItems) {
    const searchableText = [
      item.id,
      item.title,
      ...item.tags,
      item.content,
      ...Object.entries(item.sections || {}).flat(),
    ]
      .join(' ')
      .toLowerCase();
    assert.ok(searchableText.includes('matrix'), `${item.id} must match the query`);
  }

  // 5. Verify ConsoleReporter can print catalog
  assert.doesNotThrow(() => {
    ConsoleReporter.printCatalog(catalog, adrItems.slice(0, 3));
  });

  // Verify the externally observable catalog command contract as well.
  const cliOutput = execFileSync(
    process.execPath,
    [
      repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
      repositoryPath('src/cli/index.ts'),
      'catalog',
      '--docs',
      repositoryPath('docs'),
      '--format',
      'json',
      '--kind',
      'decision',
    ],
    { cwd: repositoryPath(), encoding: 'utf8' }
  );
  const cliCatalog = JSON.parse(cliOutput);
  assert.equal(cliCatalog.filteredCount, catalog.kindCounts.decision);
  assert.ok(cliCatalog.items.every((item: { kind: string }) => item.kind === 'decision'));
});
