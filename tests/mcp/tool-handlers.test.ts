import test from 'node:test';
import assert from 'node:assert/strict';
import { callMcpTool, listMcpTools, MCP_TOOL_NAMES } from '../../src/mcp/tool-handlers.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: MCP ツールハンドラ (listMcpTools / callMcpTool)
 * - 条件: 実リポジトリ docs/ を入力として 4 ツールを順に呼び出す
 * - 期待結果: SPEC-0023 / REQ-0029 の契約どおり JSON が返却されること
 * - 関連文書: TC-0042, REQ-0029, SPEC-0023
 */
test('TC-0042: MCP ツール一覧が 7 件の契約どおり公開されること', () => {
  const tools = listMcpTools();
  assert.equal(tools.length, 7);
  assert.deepEqual(tools.map(tool => tool.name), [...MCP_TOOL_NAMES]);
});

test('TC-0042: get_traceability_summary がサマリ JSON を返すこと', () => {
  const result = callMcpTool(repositoryPath('docs'), 'get_traceability_summary');
  assert.equal(result.isError, undefined);
  const body = JSON.parse(result.text);
  assert.ok(body.subject?.displayName?.length > 0);
  assert.ok(body.summary.totalRequirements > 0);
  assert.ok(body.summary.overallSufficiencyScore >= 0);
});

/**
 * 【テスト概要】
 * - 対象: MCP get_traceability_summary の subject 同梱
 * - 条件: 実 docs/ を入力としてツールを呼び出す
 * - 期待結果: 返却 JSON ルートに subject と summary が含まれること
 * - 関連文書: TC-0060, REQ-0030, SPEC-0025
 */
test('TC-0060: get_traceability_summary が subject を同梱した JSON を返すこと', () => {
  const result = callMcpTool(repositoryPath('docs'), 'get_traceability_summary');
  const body = JSON.parse(result.text);
  assert.ok(body.subject);
  assert.equal(typeof body.subject.displayName, 'string');
  assert.ok(body.subject.displayName.length > 0);
  assert.ok(body.summary.totalRequirements > 0);
});

test('TC-0042: get_requirement_status が未検出要件で ERR_REQUIREMENT_NOT_FOUND を返すこと', () => {
  const result = callMcpTool(repositoryPath('docs'), 'get_requirement_status', {
    requirementId: 'REQ-9999',
  });
  assert.equal(result.isError, true);
  const body = JSON.parse(result.text);
  assert.equal(body.error, 'ERR_REQUIREMENT_NOT_FOUND');
});

test('TC-0042: check_quality_gaps が passed フィールドを含む JSON を返すこと', () => {
  const result = callMcpTool(repositoryPath('docs'), 'check_quality_gaps', { strict: false });
  const body = JSON.parse(result.text);
  assert.equal(typeof body.passed, 'boolean');
  assert.ok(Array.isArray(body.errors));
  assert.ok(Array.isArray(body.warnings));
});

test('TC-0061: get_traceability_matrix が matrix 配列を返すこと', () => {
  const result = callMcpTool(repositoryPath('docs'), 'get_traceability_matrix');
  const body = JSON.parse(result.text);
  assert.ok(Array.isArray(body.matrix));
  assert.ok(body.matrix.length > 0);
});

test('TC-0061: get_catalog が filteredCount を含む JSON を返すこと', () => {
  const result = callMcpTool(repositoryPath('docs'), 'get_catalog', { kind: 'requirement' });
  const body = JSON.parse(result.text);
  assert.ok(body.filteredCount >= 0);
  assert.ok(Array.isArray(body.items));
});

test('TC-0061: get_decisions が adrs と dsns を返すこと', () => {
  const result = callMcpTool(repositoryPath('docs'), 'get_decisions');
  const body = JSON.parse(result.text);
  assert.ok(Array.isArray(body.adrs));
  assert.ok(Array.isArray(body.dsns));
});
