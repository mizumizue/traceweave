import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogKeyToTestCaseId,
  renderTcIdCatalogModule,
  testCaseIdToCatalogKey,
} from '../../src/core/testing/tcIdCatalog.js';

test('testCaseIdToCatalogKey — TC 文書 ID とカタログキーを相互変換できること', () => {
  assert.equal(testCaseIdToCatalogKey('TC-UT-0001'), 'TC_UT_0001');
  assert.equal(testCaseIdToCatalogKey('TC-ITb-0001-03'), 'TC_ITb_0001_03');
  assert.equal(catalogKeyToTestCaseId('TC_ITb_0001_03'), 'TC-ITb-0001-03');
});

test('renderTcIdCatalogModule — as const カタログを生成すること', () => {
  const source = renderTcIdCatalogModule([
    { id: 'TC-UT-0002', title: '異常系', status: 'accepted' },
  ]);
  assert.match(source, /TC_UT_0002: 'TC-UT-0002'/);
  assert.match(source, /export type CatalogTestCaseId/);
});
