import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTestStratumCatalog } from '../../src/core/testing/buildTestStratumCatalog.js';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { DocNode, TestLevel } from '../../src/core/models/types.js';
import { repositoryPath } from '../helpers/repo-path.js';

function tc(id: string, level: TestLevel): DocNode {
  return {
    id,
    kind: 'test_case',
    title: id,
    status: 'accepted',
    created: '2026-09-19',
    updated: '2026-09-19',
    scope: 'local',
    test_level: level,
    test_method: 'unit_contract',
    execution_status: 'passed',
    depends_on: [],
    verifies: [],
    tags: [],
    links: [],
    content: '',
    sections: {
      Objective: '目的テキスト',
      Steps: '1. 実行',
      'Expected Results': '成功すること',
    },
  };
}

/**
 * 【テスト概要】
 * - 対象: buildTestStratumCatalog
 * - 条件: 工程別の TC ノードを投入
 * - 期待結果: 章ごとに TC が分類され、仕様セクションがエントリに含まれること
 */
test('buildTestStratumCatalog - test_level ごとに章分けし仕様セクションを保持すること', () => {
  const catalog = buildTestStratumCatalog([
    tc('TC-UT-0001', 'unit'),
    tc('TC-ITb-0001', 'integration_external'),
    tc('TC-ITb-0002', 'integration_external'),
  ]);
  assert.equal(catalog.totalCases, 3);
  const itb = catalog.chapters.find(c => c.level === 'integration_external');
  assert.ok(itb);
  assert.equal(itb.cases.length, 2);
  assert.equal(itb.cases[0].sections.objective, '目的テキスト');
  assert.equal(itb.passedCount, 2);
  assert.ok(itb.cases[0].gapHints.length >= 0);
  assert.ok(typeof itb.likelySufficientCount === 'number');
  assert.ok(Array.isArray(itb.cases[0].classification.useCases));
});

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport.testStratumCatalog
 * - 条件: 実 docs を解析
 * - 期待結果: レポートに testStratumCatalog が含まれ総 TC 数が一致すること
 */
test('buildTraceWeaveReport - testStratumCatalog がレポートに含まれること', () => {
  const { report } = buildTraceWeaveReport({
    docsDir: repositoryPath('docs'),
    useCache: false,
  });
  assert.ok(report.testStratumCatalog);
  assert.equal(report.testStratumCatalog!.totalCases, report.summary.totalTestCases);
  assert.ok(report.testStratumCatalog!.chapters.every(ch => Array.isArray(ch.cases)));
});
