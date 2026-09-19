import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listDocResources,
  readDocResource,
  MCP_DOC_URI_PREFIX,
} from '../../src/mcp/resource-handlers.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: MCP リソースハンドラ (listDocResources / readDocResource)
 * - 条件: 実リポジトリ docs/ を入力としてリソース一覧と読み取りを実行
 * - 期待結果: NEED-0001 リソースが列挙され、本文が読み取れること
 * - 関連文書: TC-ITb-0030-01, SPEC-0023
 */
test('TC-ITb-0030-01: docs/ 配下の Markdown が traceweave-doc:// リソースとして列挙・読取できること', () => {
  const docsDir = repositoryPath('docs');
  const resources = listDocResources(docsDir);
  assert.ok(resources.length > 0);
  const need = resources.find(r => r.uri === `${MCP_DOC_URI_PREFIX}needs/NEED-0001.md`);
  assert.ok(need);
  const body = readDocResource(docsDir, need!.uri);
  assert.match(body.text, /NEED-0001/);
});
