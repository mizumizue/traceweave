import test from 'node:test';
import assert from 'node:assert/strict';
import { DocNode } from '../../src/core/models/types.js';
import {
  appendModalHistory,
  getNodeCopyText,
  isModalEscapeKey,
  isModalOverlayClick,
  moveModalHistory,
} from '../../src/web/src/components/modalNavigation.js';

/**
 * 【テスト概要】
 * - 対象: NodeDetailModal（モーダル内閲覧履歴スタックナビゲーション）
 * - 条件: 初期ノード REQ-0001 を表示後、依存リンクをクリックして SPEC-0002、TC-UT-0001 へ順次遷移
 * - 期待結果: 履歴スタックが [REQ-0001, SPEC-0002, TC-UT-0001] として蓄積され、戻る操作で SPEC-0002 -> REQ-0001 へ、進む操作で復帰できること
 * - 関連文書: TC-UT-0004, REQ-0013, SPEC-0013
 */
test('TC-UT-0004: NodeDetailModal - 閲覧履歴スタックの蓄積および戻る・進むナビゲーションが正確に行われること', () => {
  let state = { history: ['REQ-0001'], index: 0 };
  state = appendModalHistory(state, 'SPEC-0002');
  state = appendModalHistory(state, 'TC-UT-0001');
  assert.deepEqual(state, { history: ['REQ-0001', 'SPEC-0002', 'TC-UT-0001'], index: 2 });

  state = moveModalHistory(state, 'back');
  assert.equal(state.history[state.index], 'SPEC-0002');
  state = moveModalHistory(state, 'back');
  assert.equal(state.history[state.index], 'REQ-0001');
  state = moveModalHistory(state, 'back');
  assert.equal(state.index, 0);

  state = moveModalHistory(state, 'forward');
  assert.equal(state.history[state.index], 'SPEC-0002');
  state = moveModalHistory(state, 'forward');
  assert.equal(state.history[state.index], 'TC-UT-0001');
  state = moveModalHistory(state, 'forward');
  assert.equal(state.index, 2);

  state = moveModalHistory(state, 'back');
  state = appendModalHistory(state, 'DSN-0003');
  assert.deepEqual(state, { history: ['REQ-0001', 'SPEC-0002', 'DSN-0003'], index: 2 });
});

/**
 * 【テスト概要】
 * - 対象: NodeDetailModal の離脱判定契約
 * - 条件: Escape キーおよび外側オーバーレイクリックのイベント値を公開判定関数へ渡す
 * - 期待結果: Escape とオーバーレイ自身のクリックだけがクローズ対象として判定されること
 * - 関連文書: TC-UT-0004, REQ-0013, SPEC-0013
 */
test('TC-UT-0004: NodeDetailModal - Escapeキーおよび外側クリックハンドラにより安全にクローズ処理が呼び出されること', () => {
  assert.equal(isModalEscapeKey('Escape'), true);
  assert.equal(isModalEscapeKey('Enter'), false);
  const overlay = {};
  const child = {};
  assert.equal(isModalOverlayClick(overlay, overlay), true);
  assert.equal(isModalOverlayClick(child, overlay), false);
});

/**
 * 【テスト概要】
 * - 対象: NodeDetailModal（文書情報コピー文字列生成）
 * - 条件: ノードのID、ファイルパス、Markdown本文を対象にコピーハンドラを実行
 * - 期待結果: 正しいコピー対象テキスト文字列が抽出されること
 * - 関連文書: TC-UT-0004, REQ-0013, SPEC-0013
 */
test('TC-UT-0004: NodeDetailModal - ノードID・ファイルパス・Markdown本文のコピーデータ抽出', () => {
  const dummyNode: DocNode = {
    id: 'REQ-0013',
    kind: 'requirement',
    title: 'ノード詳細モーダルにおける閲覧履歴ナビゲーション',
    status: 'accepted',
    created: '2026-09-13',
    updated: '2026-09-13',
    scope: 'local',
    depends_on: [],
    tags: [],
    links: [],
    filePath: 'docs/requirements/REQ-0013.md',
    content: '### Statement\nStatement content...',
  };

  assert.equal(getNodeCopyText(dummyNode, 'id'), 'REQ-0013');
  assert.equal(getNodeCopyText(dummyNode, 'filePath'), 'docs/requirements/REQ-0013.md');
  assert.ok(getNodeCopyText(dummyNode, 'markdown').includes('Statement content'));
});
