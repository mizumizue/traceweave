import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';

/**
 * 【テスト概要】
 * - 対象: Header.tsx (ヘッダーロゴのルートアンカーリンクおよびインタラクション)
 * - 条件: Header.tsx ソースコードを検査
 * - 期待結果: ロゴが <a> タグで実装され、ルートへの href、onNavigateHome ハンドラ、修飾キー判定、アクセシビリティ属性が定義されていること
 * - 関連文書: TC-0020, REQ-0025, SPEC-0020
 */
test('TC-0020: Header - ロゴ要素がルートアンカーリンク（<a>）としてマークアップされ修飾キー考慮とアクセシビリティを満たすこと', () => {
  const rootDir = path.resolve('.');
  const headerPath = path.join(rootDir, 'src/web/src/components/Header.tsx');
  assert.ok(fs.existsSync(headerPath), 'Header.tsx must exist');
  const content = fs.readFileSync(headerPath, 'utf-8');

  // 1. Verify HeaderProps has onNavigateHome
  assert.ok(
    content.includes('onNavigateHome?: () => void;') || content.includes('onNavigateHome: () => void;'),
    'HeaderProps must define onNavigateHome callback'
  );

  // 2. Verify anchor element <a> is used for Logo
  assert.ok(
    content.includes('<a') && content.includes('TraceWeave') && content.includes('</a>'),
    'Header logo must be rendered as an anchor (<a>) element'
  );

  // 3. Verify href points to root path
  assert.ok(
    content.includes('href={rootHref}') || content.includes('href="/"'),
    'Logo anchor must have href pointing to root'
  );

  // 4. Verify modifier key handling (Ctrl/Cmd/Shift/Alt) to respect native browser behavior
  assert.ok(
    content.includes('e.metaKey') && content.includes('e.ctrlKey') && content.includes('e.shiftKey'),
    'handleLogoClick must check modifier keys before calling preventDefault'
  );
  assert.ok(
    content.includes('e.preventDefault()'),
    'handleLogoClick must prevent default navigation when normal left-click occurs'
  );

  // 5. Verify accessibility and tooltip attributes
  assert.ok(
    content.includes('aria-label='),
    'Logo anchor must include aria-label for accessibility'
  );
  assert.ok(
    content.includes('title='),
    'Logo anchor must include title attribute for tooltip'
  );

  // 6. Verify non-overlapping layout and un-truncated subtitle (REQ-0025 AC-6, SPEC-0020)
  assert.ok(
    content.includes('shrink-0 group cursor-pointer'),
    'Logo anchor must have shrink-0 to prevent shrinking and overlapping with version chip'
  );
  assert.ok(
    !content.includes('pl-3 ml-1 truncate'),
    'Header subtitle must not have truncate class cutting off description text'
  );
  assert.ok(
    content.includes('leading-relaxed'),
    'Header subtitle must have leading-relaxed for natural readable text wrapping'
  );
});

/**
 * 【テスト概要】
 * - 対象: App.tsx (ヘッダーロゴクリック時のルート遷移および状態リセット)
 * - 条件: App.tsx ソースコードを検査
 * - 期待結果: handleNavigateHome が定義され、タブ・ノード・フィルターが初期状態にリセットされ Header に連携されていること
 * - 関連文書: TC-0020, REQ-0025, SPEC-0020
 */
test('TC-0020: App - ヘッダーロゴクリックハンドラによるSPA初期ルート状態へのリセットとHeader連携が行われること', () => {
  const rootDir = path.resolve('.');
  const appPath = path.join(rootDir, 'src/web/src/App.tsx');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
  const content = fs.readFileSync(appPath, 'utf-8');

  // 1. Verify handleNavigateHome exists
  assert.ok(
    content.includes('const handleNavigateHome = () => {') || content.includes('handleNavigateHome = () => {'),
    'App.tsx must define handleNavigateHome function'
  );

  // 2. Verify state resets in handleNavigateHome
  assert.ok(
    content.includes("setActiveTab('matrix')"),
    'handleNavigateHome must reset active tab to matrix'
  );
  assert.ok(
    content.includes('setSelectedNodeId(null)'),
    'handleNavigateHome must reset selectedNodeId to null'
  );
  assert.ok(
    content.includes("setSearchQuery('')"),
    'handleNavigateHome must clear search query'
  );
  assert.ok(
    content.includes("setPhaseFilter('all')"),
    'handleNavigateHome must reset phaseFilter to all'
  );
  assert.ok(
    content.includes("setCriticalityFilter('all')"),
    'handleNavigateHome must reset criticalityFilter to all'
  );
  assert.ok(
    content.includes("setScoreFilter('all')"),
    'handleNavigateHome must reset scoreFilter to all'
  );

  // 3. Verify Header receives onNavigateHome prop
  assert.ok(
    content.includes('onNavigateHome={handleNavigateHome}'),
    'App.tsx must pass handleNavigateHome to Header component'
  );
});

/**
 * 【テスト概要】
 * - 対象: Traceability Graph (REQ-0025, SPEC-0020, TC-0020)
 * - 条件: docs/ 配下のドキュメント群からトレーサビリティグラフを構築
 * - 期待結果: REQ-0025, SPEC-0020, TC-0020 がグラフに存在し、仕様・検証の依存関係が正しく確立していること
 * - 関連文書: TC-0020, REQ-0025, SPEC-0020
 */
test('TC-0020: トレーサビリティ連鎖 - REQ-0025 から SPEC-0020 および TC-0020 の追跡関係の検証', () => {
  const { graph } = buildTraceWeaveReport({ docsDir: './docs', useCache: false });

  // 1. REQ-0025
  const req0025 = graph.getNode('REQ-0025');
  assert.ok(req0025, 'REQ-0025 must exist in the traceability graph');
  assert.equal(req0025?.kind, 'requirement');
  assert.equal(req0025?.title, 'Webダッシュボードのヘッダーロゴクリックによるルート画面への遷移と状態リセット');

  // 2. SPEC-0020
  const spec0020 = graph.getNode('SPEC-0020');
  assert.ok(spec0020, 'SPEC-0020 must exist in the traceability graph');
  assert.equal(spec0020?.kind, 'specification');
  assert.deepEqual(spec0020?.depends_on, ['REQ-0025'], 'SPEC-0020 must depend on REQ-0025');

  // 3. TC-0020
  const tc0020 = graph.getNode('TC-0020');
  assert.ok(tc0020, 'TC-0020 must exist in the traceability graph');
  assert.equal(tc0020?.kind, 'test_case');
  assert.ok(
    tc0020?.verifies?.includes('REQ-0025'),
    'TC-0020 must verify REQ-0025'
  );
  assert.ok(
    tc0020?.verifies?.includes('SPEC-0020'),
    'TC-0020 must verify SPEC-0020'
  );
});
