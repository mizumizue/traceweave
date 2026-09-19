import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCircularGaugeSvg } from '../../src/core/visualization/renderCircularGaugeSvg.js';

/**
 * 【テスト概要】
 * - 対象: renderCircularGaugeSvg（SVG 円形ゲージ文字列レンダラ）
 * - 条件: 0% と 100% の充足率を指定
 * - 期待結果: stroke-dashoffset が契約どおり変化すること
 * - 関連文書: TC-0012, SPEC-0010
 */
test('renderCircularGaugeSvg - 0% と 100% で stroke-dashoffset が契約どおり変化すること', () => {
  const zero = renderCircularGaugeSvg({ value: 0, size: 40 });
  const full = renderCircularGaugeSvg({ value: 100, size: 40 });
  assert.match(zero, /stroke-dashoffset="/);
  assert.match(full, /stroke-dashoffset="0"/);
});
