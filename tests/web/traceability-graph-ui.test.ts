import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';

/**
 * 【テスト概要】
 * - 対象: TraceabilityGraphView Web UI コンポーネントおよび App 統合
 * - 条件: UI ソースコード（TraceabilityGraphView.tsx, App.tsx）およびドキュメント依存グラフを静的・動的検査
 * - 期待結果: ズーム/パン操作・上流下流ハイライト・ベジェ曲線生成・詳細モーダル表示機能が実装され、NEED-0007からTC-0018までのトレーサビリティが結合されていること
 * - 関連文書: TC-0018, REQ-0020, REQ-0021, REQ-0022, SPEC-0018
 */
test('TC-0018: トレーサビリティグラフWeb UI - ズーム・パン・ハイライト探索・詳細モーダル機能およびApp統合の検証', () => {
  const rootDir = path.resolve('.');

  // 1. Verify TraceabilityGraphView component exists and has required features
  const graphViewPath = path.join(rootDir, 'src/web/src/components/TraceabilityGraphView.tsx');
  assert.ok(fs.existsSync(graphViewPath), 'TraceabilityGraphView.tsx must exist');
  const graphContent = fs.readFileSync(graphViewPath, 'utf-8');

  // Verify zoom, pan, and scroll capabilities (REQ-0020)
  assert.ok(graphContent.includes('setZoom'), 'Must support zoom control');
  assert.ok(graphContent.includes('handleFitToScreen'), 'Must support Fit to Screen / Maximize');
  assert.ok(graphContent.includes('handleFitWidth'), 'Must support Fit Width across all columns');
  assert.ok(graphContent.includes('handleResetZoom'), 'Must support Reset Zoom');
  assert.ok(graphContent.includes('handleMouseDown'), 'Must support mouse pan dragging');
  assert.ok(graphContent.includes('handleWheel'), 'Must support mouse wheel scrolling and zooming');
  assert.ok(graphContent.includes('overflow-auto'), 'Must support native container scroll for downward navigation');
  assert.ok(graphContent.includes('sticky top-0'), 'Must support sticky column headers on vertical scroll');
  assert.ok(graphContent.includes('isFullscreen'), 'Must support fullscreen / full-window view mode');

  // Verify filtering and highlight modes (REQ-0021)
  assert.ok(graphContent.includes('highlightMode'), 'Must support highlightMode');
  assert.ok(graphContent.includes('upstream'), 'Must support upstream path highlight');
  assert.ok(graphContent.includes('downstream'), 'Must support downstream path highlight');
  assert.ok(graphContent.includes('generateBezierPath'), 'Must generate smooth bezier curves for edges');
  assert.ok(graphContent.includes('hiddenKinds'), 'Must support hiddenKinds state for toggle exclusion');
  assert.ok(graphContent.includes('handleToggleKind'), 'Must support toggling kind visibility');
  assert.ok(graphContent.includes('handleResetKindFilter'), 'Must support resetting all kind filters to All');
  assert.ok(graphContent.includes('excludedKinds'), 'Must pass excludedKinds to TraceabilityGraphBuilder');

  // Verify detail inspection and selection (REQ-0022)
  assert.ok(graphContent.includes('handleOpenDetail'), 'Must support opening document detail');
  assert.ok(graphContent.includes('selectedNode'), 'Must support selected node inspection banner');

  // 2. Verify App.tsx has integrated the graph view tab with expanded wide container
  const appTsxPath = path.join(rootDir, 'src/web/src/App.tsx');
  assert.ok(fs.existsSync(appTsxPath), 'App.tsx must exist');
  const appContent = fs.readFileSync(appTsxPath, 'utf-8');
  assert.ok(appContent.includes("from './components/TraceabilityGraphView.js'"), 'App.tsx must import TraceabilityGraphView');
  assert.ok(appContent.includes("activeTab === 'graph'"), 'App.tsx must handle graph tab');
  assert.ok(appContent.includes('<TraceabilityGraphView'), 'App.tsx must render <TraceabilityGraphView />');
  assert.ok(appContent.includes("activeTab === 'graph' ? 'max-w-[1920px]"), 'App.tsx must expand container width for graph tab');

  // 3. Verify static build contains built assets
  const distWeb = path.join(rootDir, 'src/web/dist');
  assert.ok(fs.existsSync(distWeb), 'src/web/dist must exist');
  const indexHtml = path.join(distWeb, 'index.html');
  assert.ok(fs.existsSync(indexHtml), 'src/web/dist/index.html must exist');

  // 4. Verify V-model Traceability linking: NEED-0007 <- REQ-0020, 0021, 0022 <- SPEC-0018 <- TC-0018
  const { graph } = buildTraceWeaveReport({ docsDir: './docs', useCache: false });

  const need0007 = graph.getNode('NEED-0007');
  assert.ok(need0007, 'NEED-0007 must exist in the graph');
  assert.equal(need0007?.kind, 'need');

  const req0020 = graph.getNode('REQ-0020');
  assert.ok(req0020, 'REQ-0020 must exist');
  assert.ok(req0020?.depends_on.includes('NEED-0007'));

  const req0021 = graph.getNode('REQ-0021');
  assert.ok(req0021, 'REQ-0021 must exist');
  assert.ok(req0021?.depends_on.includes('NEED-0007'));

  const req0022 = graph.getNode('REQ-0022');
  assert.ok(req0022, 'REQ-0022 must exist');
  assert.ok(req0022?.depends_on.includes('NEED-0007'));

  const spec0018 = graph.getNode('SPEC-0018');
  assert.ok(spec0018, 'SPEC-0018 must exist');
  assert.ok(spec0018?.depends_on.includes('REQ-0020'));
  assert.ok(spec0018?.depends_on.includes('REQ-0021'));
  assert.ok(spec0018?.depends_on.includes('REQ-0022'));

  const tc0018 = graph.getNode('TC-0018');
  assert.ok(tc0018, 'TC-0018 must exist');
  assert.ok(tc0018?.verifies?.includes('REQ-0020'));
  assert.ok(tc0018?.verifies?.includes('SPEC-0018'));
});
