import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_URL_STATE,
  getHomeUrlState,
  parseUrlState,
  serializeUrlState,
} from '../../src/web/src/utils/urlState.js';

/**
 * 【テスト概要】
 * - 対象: urlState の reqclass 双方向同期
 * - 条件: functional / non_functional / 欠落 / 不正値
 * - 期待結果: 正常値は相互変換され、不正値とデフォルトは all になる
 * - 関連文書: TC-UT-0008, REQ-0027, SPEC-0022
 */
test('TC-UT-0008: urlState - 要件区分フィルター reqclass がパース・シリアライズ・ホーム状態で契約どおりであること', () => {
  assert.equal(parseUrlState('?reqclass=functional').requirementClassFilter, 'functional');
  assert.equal(parseUrlState('?reqclass=non_functional').requirementClassFilter, 'non_functional');
  assert.equal(parseUrlState('?reqclass=quality').requirementClassFilter, 'all');
  const serialized = serializeUrlState({ ...DEFAULT_URL_STATE, requirementClassFilter: 'functional' });
  assert.ok(serialized.includes('reqclass=functional'));
  assert.equal(getHomeUrlState().requirementClassFilter, 'all');
});
