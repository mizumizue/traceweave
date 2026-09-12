import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';
import { getHeaderLinkContract, shouldUseInternalNavigation } from '../../src/web/src/components/Header.js';
import { getHomeUrlState } from '../../src/web/src/utils/urlState.js';

/**
 * 【テスト概要】
 * - 対象: Header のロゴリンク公開契約およびクリック判定
 * - 条件: Header が公開するリンク契約とクリック判定を呼び出す
 * - 期待結果: ルートへの href、アクセシビリティ属性、修飾キー判定が契約どおり返ること
 * - 関連文書: TC-0020, REQ-0025, SPEC-0020
 */
test('TC-0020: Header - ロゴリンク契約がルート先・修飾キー判定・アクセシビリティを満たすこと', () => {
  assert.deepEqual(getHeaderLinkContract(), {
    href: '/',
    ariaLabel: 'TraceWeave ホームへ戻る',
    title: 'TraceWeave トップ（ルート画面）へ戻る',
  });
  assert.ok(shouldUseInternalNavigation({ button: 0 }));
  assert.equal(shouldUseInternalNavigation({ button: 0, ctrlKey: true }), false);
});

/**
 * 【テスト概要】
 * - 対象: ヘッダーロゴのホーム状態契約
 * - 条件: ホーム状態を返す公開関数を呼び出す
 * - 期待結果: タブ・ノード・フィルターが初期状態にリセットされること
 * - 関連文書: TC-0020, REQ-0025, SPEC-0020
 */
test('TC-0020: ホーム状態契約 - ヘッダーロゴ遷移先の初期状態が返ること', () => {
  assert.deepEqual(getHomeUrlState(), {
    tab: 'matrix',
    nodeId: null,
    searchQuery: '',
    phaseFilter: 'all',
    criticalityFilter: 'all',
    scoreFilter: 'all',
    catalogKind: 'all',
    catalogTag: null,
    catalogStatus: 'all',
    graphHighlight: 'all',
  });
});

/**
 * 【テスト概要】
 * - 対象: Traceability Graph (REQ-0025, SPEC-0020, TC-0020)
 * - 条件: docs/ 配下のドキュメント群からトレーサビリティグラフを構築
 * - 期待結果: REQ-0025, SPEC-0020, TC-0020 がグラフに存在し、仕様・検証の依存関係が正しく確立していること
 * - 関連文書: TC-0020, REQ-0025, SPEC-0020
 */
test('TC-0020: トレーサビリティ連鎖 - REQ-0025 から SPEC-0020 および TC-0020 の追跡関係の検証', () => {
  const { graph } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });

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
