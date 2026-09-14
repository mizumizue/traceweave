import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { HtmlReporter } from '../../src/infrastructure/reporters/HtmlReporter.js';
import { renderCircularGaugeSvg } from '../../src/core/visualization/renderCircularGaugeSvg.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: CLI HTML フォールバック（CircularGauge SVG / HtmlReporter）
 * - 条件: 実レポートを HTML 化し、SVG ゲージ断片を単体検証する
 * - 期待結果: SPEC-0010 の SVG 出力契約を満たすこと
 * - 関連文書: TC-0012, SPEC-0010
 */
test('HtmlReporter - レポート HTML に SVG 円形ゲージが埋め込まれること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const html = HtmlReporter.generateHtml(report);
  assert.match(html, /<svg[^>]*role="img"/);
  assert.match(html, /Traceability Matrix/);
  assert.ok(html.includes(report.matrix[0].requirementId));
});

test('renderCircularGaugeSvg - 0% と 100% で stroke-dashoffset が契約どおり変化すること', () => {
  const zero = renderCircularGaugeSvg({ value: 0, size: 40 });
  const full = renderCircularGaugeSvg({ value: 100, size: 40 });
  assert.match(zero, /stroke-dashoffset="/);
  assert.match(full, /stroke-dashoffset="0"/);
});
