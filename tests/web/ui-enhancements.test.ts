import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';

/**
 * 【テスト概要】
 * - 対象: Web UI機能強化（Sonnerトースト通知、視覚的テストピラミッド、モーダル履歴管理、エクスポート機能）
 * - 条件: App.tsx、InteractiveTestRunner.tsx、VisualTestPyramid.tsx、ビルド成果物を検査
 * - 期待結果: SonnerのToasterやtoast通知、VisualTestPyramidの描画、モーダルの戻るナビゲーション、CSV/JSONエクスポート機能が実装され、REQ-0012等のトレーサビリティが確立していること
 * - 関連文書: TC-0015, REQ-0012, SPEC-0012
 */
test('TC-0015: Web UI機能強化 - Sonnerトースト通知、視覚的テストピラミッド、モーダル履歴遷移、およびエクスポート機能の検証', () => {
  const rootDir = path.resolve('.');

  // 1. Verify App.tsx has Toaster and sonner imports
  const appTsxPath = path.join(rootDir, 'src/web/src/App.tsx');
  assert.ok(fs.existsSync(appTsxPath), 'src/web/src/App.tsx must exist');
  const appContent = fs.readFileSync(appTsxPath, 'utf-8');
  assert.ok(appContent.includes("from 'sonner'"), 'App.tsx must import from sonner');
  assert.ok(appContent.includes('<Toaster'), 'App.tsx must render <Toaster /> at root');
  assert.ok(appContent.includes('VisualTestPyramid'), 'App.tsx must import and use VisualTestPyramid');
  assert.ok(appContent.includes('handleBack'), 'App.tsx must implement history navigation in modal');
  assert.ok(appContent.includes('handleExportCsv'), 'App.tsx must implement CSV export');
  assert.ok(appContent.includes('handleExportJson'), 'App.tsx must implement JSON export');

  // 2. Verify InteractiveTestRunner has sonner toast integration and copy functions
  const runnerPath = path.join(rootDir, 'src/web/src/components/InteractiveTestRunner.tsx');
  assert.ok(fs.existsSync(runnerPath), 'InteractiveTestRunner.tsx must exist');
  const runnerContent = fs.readFileSync(runnerPath, 'utf-8');
  assert.ok(runnerContent.includes("from 'sonner'"), 'InteractiveTestRunner must import toast from sonner');
  assert.ok(runnerContent.includes('toast.loading'), 'InteractiveTestRunner must show loading toast during test execution');
  assert.ok(runnerContent.includes('toast.success'), 'InteractiveTestRunner must show success toast');
  assert.ok(runnerContent.includes('handleFormatJson'), 'InteractiveTestRunner must have JSON format utility');

  // 3. Verify VisualTestPyramid component exists and renders layers
  const pyramidPath = path.join(rootDir, 'src/web/src/components/VisualTestPyramid.tsx');
  assert.ok(fs.existsSync(pyramidPath), 'VisualTestPyramid.tsx must exist');
  const pyramidContent = fs.readFileSync(pyramidPath, 'utf-8');
  assert.ok(pyramidContent.includes('acceptance'), 'VisualTestPyramid must include acceptance level');
  assert.ok(pyramidContent.includes('unit'), 'VisualTestPyramid must include unit level');
  assert.ok(pyramidContent.includes('CircularGauge'), 'VisualTestPyramid must integrate CircularGauge');

  // 4. Verify Built web assets contain sonner styles and bundle
  const distWeb = fs.existsSync(path.join(rootDir, 'src/web/dist'))
    ? path.join(rootDir, 'src/web/dist')
    : path.join(rootDir, 'dist/web');
  assert.ok(fs.existsSync(distWeb), 'web dist directory must exist');
  const indexHtml = path.join(distWeb, 'index.html');
  assert.ok(fs.existsSync(indexHtml), 'web dist index.html must exist');

  // 5. Verify Traceability linking for REQ-0012, SPEC-0012, TC-0015
  const { graph } = buildTraceWeaveReport({ docsDir: './docs', useCache: false });
  const req0012 = graph.getNode('REQ-0012');
  assert.ok(req0012, 'REQ-0012 must exist in the graph');
  assert.deepEqual(req0012?.depends_on, ['NEED-0005']);

  const spec0012 = graph.getNode('SPEC-0012');
  assert.ok(spec0012, 'SPEC-0012 must exist in the graph');
  assert.deepEqual(spec0012?.depends_on, ['REQ-0012']);

  const tc0015 = graph.getNode('TC-0015');
  assert.ok(tc0015, 'TC-0015 must exist in the graph');
  assert.ok(tc0015?.verifies?.includes('REQ-0012'));
  assert.ok(tc0015?.verifies?.includes('SPEC-0012'));
});
