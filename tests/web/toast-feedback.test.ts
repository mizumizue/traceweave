import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appSource = fs.readFileSync(
  path.resolve(__dirname, '../../src/web/src/App.tsx'),
  'utf8'
);

/**
 * 【テスト概要】
 * - 対象: Web ダッシュボード トースト通知基盤（Toaster マウント契約）
 * - 条件: App.tsx ソースおよびトレーサビリティグラフを検査
 * - 期待結果: Toaster がルートに常駐マウントされ、REQ-0012 / SPEC-0012 / TC-0037 の追跡関係が成立していること
 * - 関連文書: TC-0037, REQ-0012, SPEC-0012
 */
test('TC-0037: トースト基盤 - ルートコンポーネントに Toaster が契約どおりマウントされていること', () => {
  assert.match(appSource, /<Toaster/);
  assert.match(appSource, /position="bottom-right"/);
  assert.match(appSource, /theme="dark"/);
  assert.match(appSource, /closeButton/);
});

/**
 * 【テスト概要】
 * - 対象: Traceability Graph (REQ-0012, SPEC-0012, TC-0037)
 * - 条件: docs/ 配下のドキュメント群からトレーサビリティグラフを構築
 * - 期待結果: REQ-0012, SPEC-0012, TC-0037 がグラフに存在し、仕様・検証の依存関係が正しく確立していること
 * - 関連文書: TC-0037, REQ-0012, SPEC-0012
 */
test('TC-0037: トレーサビリティ連鎖 - REQ-0012 から SPEC-0012 および TC-0037 の追跡関係の検証', () => {
  const { graph } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });

  const req0012 = graph.getNode('REQ-0012');
  assert.ok(req0012, 'REQ-0012 must exist in the traceability graph');
  assert.equal(req0012?.kind, 'requirement');

  const spec0012 = graph.getNode('SPEC-0012');
  assert.ok(spec0012, 'SPEC-0012 must exist in the traceability graph');
  assert.deepEqual(spec0012?.depends_on, ['REQ-0012']);

  const tc0037 = graph.getNode('TC-0037');
  assert.ok(tc0037, 'TC-0037 must exist in the traceability graph');
  assert.ok(tc0037?.verifies?.includes('REQ-0012'));
  assert.ok(tc0037?.verifies?.includes('SPEC-0012'));
});
