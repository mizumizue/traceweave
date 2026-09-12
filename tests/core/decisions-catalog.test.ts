import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { DocNode } from '../../src/core/models/types.js';
import { DecisionsCatalogBuilder } from '../../src/core/decisions/DecisionsCatalogBuilder.js';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';

/**
 * 【テスト概要】
 * - 対象: DecisionsCatalogBuilder (決め事カタログ構築・集約)
 * - 条件: 全9種別（actor, use_case, need, requirement, specification, design, decision, QA, test_case）の合成DocNode群を渡してカタログを構築
 * - 期待結果: 全9種別の件数集計、ACTとUCの逆引き参照、DSNとADRの双方向リンク、種別・タグ・キーワードによるフィルタリングが正常に動作すること
 * - 関連文書: TC-0017, REQ-0017, REQ-0018, REQ-0019, SPEC-0017
 */
test('TC-0017: DecisionsCatalogBuilder - 全9種別のドキュメント集約、相互参照解決（ACT-UC逆引き・DSN-ADR双方向）およびフィルタリングが正しく機能すること', () => {
  const nodes: DocNode[] = [
    {
      id: 'ACT-0001',
      kind: 'actor',
      title: '開発者',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      tags: ['developer', 'core'],
      links: [],
      content: '',
      sections: { Role: 'システムの開発およびテストを行う' },
    },
    {
      id: 'UC-0001',
      kind: 'use_case',
      title: 'トレーサビリティチェックを実行する',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      actor_refs: ['ACT-0001'],
      requirement_refs: ['REQ-0001'],
      tags: ['ci', 'check'],
      links: [],
      content: '',
    },
    {
      id: 'NEED-0001',
      kind: 'need',
      title: 'トレーサビリティを可視化したい',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      tags: ['traceability'],
      links: [],
      content: '',
    },
    {
      id: 'REQ-0001',
      kind: 'requirement',
      title: 'トレーサビリティマトリクスを閲覧できる',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      criticality: 'high',
      depends_on: ['NEED-0001'],
      tags: ['matrix', 'view'],
      links: [],
      content: '',
    },
    {
      id: 'SPEC-0001',
      kind: 'specification',
      title: 'マトリクス生成API仕様',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['REQ-0001'],
      tags: ['api'],
      links: [],
      content: '',
    },
    {
      id: 'DSN-0001',
      kind: 'design',
      title: 'マトリクスビルダー設計',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['SPEC-0001'],
      tags: ['builder'],
      links: ['ADR-0001'],
      content: '',
    },
    {
      id: 'ADR-0001',
      kind: 'decision',
      title: 'Pure TypeScript Coreの採用',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: [],
      tags: ['core', 'architecture'],
      links: ['DSN-0001'],
      content: '',
    },
    {
      id: 'QA-0001',
      kind: 'quality_assurance',
      title: 'マトリクス品質保証方針',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      depends_on: ['REQ-0001'],
      tags: ['quality'],
      links: [],
      content: '',
    },
    {
      id: 'TC-0001',
      kind: 'test_case',
      title: 'マトリクス生成テスト',
      status: 'accepted',
      created: '2026-09-12',
      updated: '2026-09-12',
      scope: 'local',
      test_level: 'unit',
      test_method: 'unit_mock',
      verifies: ['REQ-0001', 'SPEC-0001'],
      depends_on: [],
      tags: ['unit'],
      links: [],
      content: '',
    },
  ];

  const catalog = DecisionsCatalogBuilder.build(nodes);

  // 1. Kind counts
  assert.equal(catalog.totalCount, 9);
  assert.equal(catalog.kindCounts.actor, 1);
  assert.equal(catalog.kindCounts.use_case, 1);
  assert.equal(catalog.kindCounts.need, 1);
  assert.equal(catalog.kindCounts.requirement, 1);
  assert.equal(catalog.kindCounts.specification, 1);
  assert.equal(catalog.kindCounts.design, 1);
  assert.equal(catalog.kindCounts.decision, 1);
  assert.equal(catalog.kindCounts.quality_assurance, 1);
  assert.equal(catalog.kindCounts.test_case, 1);

  // 2. Cross references: ACT-0001 should have reverse link to UC-0001
  const actItem = catalog.items.find(i => i.id === 'ACT-0001');
  assert.ok(actItem);
  assert.equal(actItem?.relatedUseCases?.length, 1);
  assert.equal(actItem?.relatedUseCases?.[0].id, 'UC-0001');

  // 3. Cross references: UC-0001 should have relatedActors and relatedReqs
  const ucItem = catalog.items.find(i => i.id === 'UC-0001');
  assert.ok(ucItem);
  assert.equal(ucItem?.relatedActors?.length, 1);
  assert.equal(ucItem?.relatedActors?.[0].id, 'ACT-0001');
  assert.equal(ucItem?.relatedReqs?.length, 1);
  assert.equal(ucItem?.relatedReqs?.[0].id, 'REQ-0001');

  // 4. Cross references: DSN-0001 and ADR-0001 bidirectional links
  const dsnItem = catalog.items.find(i => i.id === 'DSN-0001');
  assert.ok(dsnItem);
  assert.equal(dsnItem?.relatedDecisions?.length, 1);
  assert.equal(dsnItem?.relatedDecisions?.[0].id, 'ADR-0001');

  const adrItem = catalog.items.find(i => i.id === 'ADR-0001');
  assert.ok(adrItem);
  assert.equal(adrItem?.relatedDesigns?.length, 1);
  assert.equal(adrItem?.relatedDesigns?.[0].id, 'DSN-0001');

  // 5. Filtering
  // Filter by kind
  const actOnly = DecisionsCatalogBuilder.filter(catalog, { kind: 'actor' });
  assert.equal(actOnly.length, 1);
  assert.equal(actOnly[0].id, 'ACT-0001');

  // Filter by tag
  const coreTagged = DecisionsCatalogBuilder.filter(catalog, { tag: 'core' });
  assert.equal(coreTagged.length, 2); // ACT-0001, ADR-0001

  // Filter by search query
  const searchResult = DecisionsCatalogBuilder.filter(catalog, { query: 'TypeScript' });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, 'ADR-0001');
});

/**
 * 【テスト概要】
 * - 対象: DecisionsCatalogBuilder & DocParser 結合テスト
 * - 条件: 実際のリポジトリ内 docs/ ディレクトリをスキャンして全ドキュメントをパース
 * - 期待結果: 70件以上のドキュメントがカタログ化され、各主要種別の件数が0件超となり、ACT-0001等の相互参照が正常に解決されること
 * - 関連文書: TC-0017, REQ-0017, REQ-0018
 */
test('TC-0017: DecisionsCatalogBuilder - 実際のdocsディレクトリを読み込み、全種別のカタログ集約と相互参照解決が決定論的に成功すること', () => {
  const parser = new DocParser();
  const docsDir = fs.existsSync(path.resolve(process.cwd(), 'docs'))
    ? path.resolve(process.cwd(), 'docs')
    : path.resolve(process.cwd(), '../docs');
  const nodes = parser.parseDirectory(docsDir);

  assert.ok(nodes.length > 70, `Expected >70 nodes, got ${nodes.length}`);

  const catalog = DecisionsCatalogBuilder.build(nodes);
  assert.equal(catalog.totalCount, nodes.length);
  assert.ok(catalog.kindCounts.need > 0);
  assert.ok(catalog.kindCounts.actor > 0);
  assert.ok(catalog.kindCounts.use_case > 0);
  assert.ok(catalog.kindCounts.requirement > 0);
  assert.ok(catalog.kindCounts.specification > 0);
  assert.ok(catalog.kindCounts.design > 0);
  assert.ok(catalog.kindCounts.decision > 0);

  // ACT-0001 should have related use cases
  const act1 = catalog.items.find(i => i.id === 'ACT-0001');
  assert.ok(act1);
  assert.ok((act1.relatedUseCases?.length || 0) > 0);
});
