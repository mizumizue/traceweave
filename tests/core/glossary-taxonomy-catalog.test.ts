import assert from 'node:assert/strict';
import test from 'node:test';
import { DecisionsCatalogBuilder } from '../../src/core/decisions/DecisionsCatalogBuilder.js';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { resolveRepoRoot } from '../../src/infrastructure/system/resolveRepoRoot.js';
import path from 'node:path';

/**
 * 【テスト概要】
 * - 対象: glossary_scope / glossary_domain と DecisionsCatalog の集計・フィルタ
 * - 条件: 実 docs/glossary の GLO 文書をパース
 * - 期待結果: 全用語が分類済みで、スコープ・ドメインフィルタが用語のみに適用されること
 */
test('GlossaryTaxonomy - 実用語集の分類メタデータ集計とカタログフィルタが整合すること', () => {
  const docsDir = path.join(resolveRepoRoot(import.meta.url), 'docs');
  const parser = new DocParser();
  const nodes = parser.parseDirectory(docsDir);
  const catalog = DecisionsCatalogBuilder.build(nodes);

  assert.equal(catalog.glossaryTaxonomyCounts.unclassified, 0);
  assert.ok(catalog.glossaryTaxonomyCounts.byScope.platform >= 14);
  assert.ok(catalog.glossaryTaxonomyCounts.byScope.general > 0);

  const platformOnly = DecisionsCatalogBuilder.filter(catalog, {
    kind: 'glossary',
    glossaryScope: 'platform',
  });
  assert.ok(platformOnly.length >= 14);
  assert.ok(platformOnly.every(item => item.glossary_scope === 'platform'));

  const testingOnly = DecisionsCatalogBuilder.filter(catalog, {
    kind: 'glossary',
    glossaryDomain: 'testing',
  });
  assert.ok(testingOnly.length > 0);
  assert.ok(testingOnly.every(item => item.glossary_domain === 'testing'));

  const reqStillVisible = DecisionsCatalogBuilder.filter(catalog, {
    kind: 'requirement',
    glossaryDomain: 'testing',
  });
  assert.ok(reqStillVisible.length > 0);
});
