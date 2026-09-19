import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formalTestTitle } from '../../src/core/testing/formalTestTitle.js';
import { testFileDeclaresCase } from '../../src/core/testing/formatTestRunCommand.js';
import { TC_IDS } from '../../src/generated/traceweave-tc-ids.js';

/**
 * 【テスト概要】
 * - 対象: formalTestTitle / TC_IDS カタログ連携
 * - 条件: 生成カタログの TC-UT-0001 を使用
 * - 期待結果: 形式証跡用タイトルが TC 先頭になり、--tc 解決が本ファイルを拾えること
 */
test(formalTestTitle(TC_IDS.TC_UT_0001, 'カタログ経由の形式宣言行スモーク'), () => {
  assert.equal(
    formalTestTitle(TC_IDS.TC_UT_0001, '説明'),
    'TC-UT-0001: 説明'
  );
});

test('testFileDeclaresCase — formalTestTitle(TC_IDS.*) 宣言行を --tc 解決対象として認識すること', () => {
  const selfPath = fileURLToPath(import.meta.url);
  const content = fs.readFileSync(selfPath, 'utf8');
  assert.ok(testFileDeclaresCase(content, 'TC-UT-0001'));
});
