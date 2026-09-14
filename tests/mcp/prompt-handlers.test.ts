import test from 'node:test';
import assert from 'node:assert/strict';
import { getMcpPrompt, listMcpPrompts, MCP_PROMPT_NAMES } from '../../src/mcp/prompt-handlers.js';

/**
 * 【テスト概要】
 * - 対象: MCP プロンプトハンドラ (listMcpPrompts / getMcpPrompt)
 * - 条件: 3 プロンプトを列挙し traceability_review を取得
 * - 期待結果: プロンプト一覧が契約どおり 3 件、メッセージ本文が非空であること
 * - 関連文書: TC-0061, SPEC-0023
 */
test('TC-0061: MCP プロンプト一覧が 3 件の契約どおり公開されること', () => {
  const prompts = listMcpPrompts();
  assert.equal(prompts.length, 3);
  assert.deepEqual(prompts.map(p => p.name), [...MCP_PROMPT_NAMES]);
});

test('TC-0061: traceability_review プロンプトが user メッセージを返すこと', () => {
  const result = getMcpPrompt('traceability_review', { requirementId: 'REQ-0001' });
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].role, 'user');
  assert.match(result.messages[0].content.text, /REQ-0001/);
});
