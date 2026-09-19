import test from 'node:test';
import assert from 'node:assert/strict';
import { DocNode, MatrixRow } from '../../src/core/models/types.js';
import { DecisionsCatalogBuilder } from '../../src/core/decisions/DecisionsCatalogBuilder.js';
import { partitionByRequirementClass } from '../../src/core/models/requirementClass.js';
import { filterMatrixRows } from '../../src/web/src/utils/matrixData.js';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';

function node(partial: Partial<DocNode> & Pick<DocNode, 'id' | 'kind' | 'title'>): DocNode {
  return {
    status: 'accepted',
    created: '2026-09-13',
    updated: '2026-09-13',
    scope: 'local',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
    ...partial,
  };
}

/**
 * 【テスト概要】
 * - 対象: DecisionsCatalogBuilder と filterMatrixRows の要件区分伝播・フィルター
 * - 条件: 機能要件・非機能要件・仕様が混在する合成ノード
 * - 期待結果: 件数集計と区分フィルターが混入なく切り分け、分割順が機能→非機能→その他になる
 * - 関連文書: TC-ITa-0002, REQ-0026, REQ-0027, SPEC-0021
 */
test('TC-ITa-0002: 要件区分 - カタログ伝播・フィルターおよびグループ分割が混入なく動作すること', () => {
  const nodes: DocNode[] = [
    node({ id: 'NEED-0001', kind: 'need', title: '区分したい' }),
    node({
      id: 'REQ-F1',
      kind: 'requirement',
      title: '機能要件A',
      requirement_class: 'functional',
      depends_on: ['NEED-0001'],
    }),
    node({
      id: 'REQ-N1',
      kind: 'requirement',
      title: '非機能要件A',
      requirement_class: 'non_functional',
      depends_on: ['NEED-0001'],
    }),
    node({
      id: 'SPEC-0001',
      kind: 'specification',
      title: '契約',
      depends_on: ['REQ-F1'],
    }),
  ];

  const catalog = DecisionsCatalogBuilder.build(nodes);
  assert.deepEqual(catalog.requirementClassCounts, {
    functional: 1,
    non_functional: 1,
    unclassified: 0,
  });
  assert.equal(catalog.items.find(item => item.id === 'REQ-F1')?.requirement_class, 'functional');
  assert.equal(catalog.items.find(item => item.id === 'REQ-N1')?.requirement_class, 'non_functional');

  const functionalOnly = DecisionsCatalogBuilder.filter(catalog, { requirementClass: 'functional' });
  assert.deepEqual(
    functionalOnly.filter(item => item.kind === 'requirement').map(item => item.id),
    ['REQ-F1']
  );
  assert.ok(functionalOnly.some(item => item.kind === 'specification'));

  const nfrOnly = DecisionsCatalogBuilder.filter(catalog, { requirementClass: 'non_functional' });
  assert.deepEqual(
    nfrOnly.filter(item => item.kind === 'requirement').map(item => item.id),
    ['REQ-N1']
  );

  const partitioned = partitionByRequirementClass(catalog.items);
  assert.deepEqual(partitioned.functional.map(item => item.id), ['REQ-F1']);
  assert.deepEqual(partitioned.non_functional.map(item => item.id), ['REQ-N1']);
  assert.ok(partitioned.other.every(item => item.kind !== 'requirement'));
  assert.equal(
    partitioned.functional.length + partitioned.non_functional.length + partitioned.other.length,
    catalog.items.length
  );

  const rows: MatrixRow[] = [
    {
      requirementId: 'REQ-F1',
      requirementTitle: '機能要件A',
      criticality: 'high',
      requirementClass: 'functional',
      score: 80,
      specs: [],
      directTestCases: [],
      allTestCases: [],
    },
    {
      requirementId: 'REQ-N1',
      requirementTitle: '非機能要件A',
      criticality: 'high',
      requirementClass: 'non_functional',
      score: 40,
      specs: [],
      directTestCases: [],
      allTestCases: [],
    },
  ];
  assert.deepEqual(
    filterMatrixRows(rows, { requirementClass: 'functional' }).map(row => row.requirementId),
    ['REQ-F1']
  );
  assert.deepEqual(
    filterMatrixRows(rows, { requirementClass: 'non_functional' }).map(row => row.requirementId),
    ['REQ-N1']
  );
});

/**
 * 【テスト概要】
 * - 対象: 実ドキュメントからのレポート構築
 * - 条件: docs/ をパースしてカタログとサマリーを得る
 * - 期待結果: FR/NFR 件数が要件総数と整合し、新設ツリーが追跡できる
 * - 関連文書: TC-ITa-0002, NEED-0009, REQ-0026, REQ-0027, REQ-0028
 */
test('TC-ITa-0002: 要件区分 - 実レポートの FR/NFR 件数と NEED-0009 トレーサビリティが整合すること', () => {
  const { report, graph } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const reqCount = graph.getRequirements().length;
  assert.equal(
    report.summary.functionalRequirementCount + report.summary.nonFunctionalRequirementCount,
    reqCount
  );
  assert.ok(report.summary.functionalRequirementCount > 0);
  assert.ok(report.summary.nonFunctionalRequirementCount > 0);
  assert.equal(report.catalog?.requirementClassCounts.functional, report.summary.functionalRequirementCount);
  assert.equal(report.catalog?.requirementClassCounts.non_functional, report.summary.nonFunctionalRequirementCount);

  const need = graph.getNode('NEED-0009');
  assert.ok(need);
  for (const id of ['REQ-0026', 'REQ-0027', 'REQ-0028']) {
    const req = graph.getNode(id);
    assert.ok(req, `${id} must exist`);
    assert.ok(req?.depends_on.includes('NEED-0009'));
  }
  assert.equal(graph.getNode('REQ-0028')?.requirement_class, 'non_functional');
});
