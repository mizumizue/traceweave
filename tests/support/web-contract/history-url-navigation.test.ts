import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseUrlState,
  serializeUrlState,
  buildFullUrl,
  isUrlStateEqual,
  DEFAULT_URL_STATE,
  AppUrlState,
  getHomeUrlState,
  isOnlySearchQueryChanged,
} from '../../../src/web/src/utils/urlState.js';
import { buildTraceWeaveReport } from '../../../src/application/build-report.js';
import { repositoryPath } from '../../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: urlState.ts (URLクエリパラメータパース・シリアライズ・履歴制御ユーティリティ)
 * - 条件: 正常なパラメータ文字列、空文字列、異常値、デフォルト値混在クエリを投入
 * - 期待結果: 各種パラメータ（tab, node, q, phase, criticality, score, kind, tag, status, highlight）が正確にパースされ、不正値が安全にフォールバックすること
 * - 関連文書: TC-ITb-0015, REQ-0024, SPEC-0019
 */
test('support: ITb-0015: urlState - クエリ文字列からの状態パースと不正値フォールバックが正確に行われること', () => {
  // 1. 空・未指定時はデフォルト状態が返ること
  const defaultParsed = parseUrlState('');
  assert.equal(defaultParsed.tab, 'traceability');
  assert.equal(defaultParsed.traceabilityView, 'matrix');
  assert.equal(defaultParsed.nodeId, null);
  assert.equal(defaultParsed.searchQuery, '');
  assert.equal(defaultParsed.phaseFilter, 'all');
  assert.equal(defaultParsed.criticalityFilter, 'all');
  assert.equal(defaultParsed.requirementClassFilter, 'all');
  assert.equal(defaultParsed.scoreFilter, 'all');
  assert.equal(defaultParsed.catalogKind, 'all');
  assert.equal(defaultParsed.catalogTag, null);
  assert.equal(defaultParsed.catalogStatus, 'all');
  assert.equal(defaultParsed.graphHighlight, 'all');

  // 2. 全パラメータが指定されたクエリ文字列の正常パース
  const fullQuery =
    '?tab=graph&node=REQ-0001&q=traceability&phase=integration_internal&criticality=high&reqclass=non_functional&score=satisfied&kind=requirement&tag=core&status=accepted&highlight=upstream';
  const fullParsed = parseUrlState(fullQuery);
  assert.equal(fullParsed.tab, 'traceability');
  assert.equal(fullParsed.traceabilityView, 'graph');
  assert.equal(fullParsed.nodeId, 'REQ-0001');
  assert.equal(fullParsed.searchQuery, 'traceability');
  assert.equal(fullParsed.phaseFilter, 'integration_internal');
  assert.equal(fullParsed.criticalityFilter, 'high');
  assert.equal(fullParsed.requirementClassFilter, 'non_functional');
  assert.equal(fullParsed.scoreFilter, 'satisfied');
  assert.equal(fullParsed.catalogKind, 'requirement');
  assert.equal(fullParsed.catalogTag, 'core');
  assert.equal(fullParsed.catalogStatus, 'accepted');
  assert.equal(fullParsed.graphHighlight, 'upstream');

  // 3. 不正値・異常値が指定された場合の安全なフォールバック
  const invalidQuery =
    '?tab=unknown_tab&node=%20%20&q=%20&phase=invalid_phase&criticality=super_high&reqclass=quality&score=perfect&kind=unknown_kind&status=flying&highlight=random_highlight';
  const invalidParsed = parseUrlState(invalidQuery);
  assert.equal(invalidParsed.tab, 'traceability', 'Invalid tab must fallback to traceability');
  assert.equal(invalidParsed.traceabilityView, 'matrix', 'Invalid tab must fallback to matrix view');
  assert.equal(invalidParsed.nodeId, null, 'Whitespace-only nodeId must fallback to null');
  assert.equal(invalidParsed.phaseFilter, 'all', 'Invalid phase must fallback to all');

  const legacyUnitPhase = parseUrlState('?phase=unit');
  assert.equal(legacyUnitPhase.phaseFilter, 'all', 'Legacy UT matrix phase must normalize to all');
  assert.equal(invalidParsed.criticalityFilter, 'all', 'Invalid criticality must fallback to all');
  assert.equal(invalidParsed.requirementClassFilter, 'all', 'Invalid reqclass must fallback to all');
  assert.equal(invalidParsed.scoreFilter, 'all', 'Invalid score must fallback to all');
  assert.equal(invalidParsed.catalogKind, 'all', 'Invalid kind must fallback to all');
  assert.equal(invalidParsed.catalogStatus, 'all', 'Invalid status must fallback to all');
  assert.equal(invalidParsed.graphHighlight, 'all', 'Invalid highlight must fallback to all');

  // 4. フルURL文字列（http://...）が渡された場合でもクエリ部分が抽出・パースされること
  const fullUrl = 'http://localhost:3000/dashboard?tab=decisions&kind=decision';
  const urlParsed = parseUrlState(fullUrl);
  assert.equal(urlParsed.tab, 'decisions');
  assert.equal(urlParsed.catalogKind, 'decision');

  // 5. レガシー tab=matrix と新形式 view=graph の互換
  const legacyMatrix = parseUrlState('?tab=matrix');
  assert.equal(legacyMatrix.tab, 'traceability');
  assert.equal(legacyMatrix.traceabilityView, 'matrix');

  const directGraphView = parseUrlState('?view=graph');
  assert.equal(directGraphView.tab, 'traceability');
  assert.equal(directGraphView.traceabilityView, 'graph');
});

/**
 * 【テスト概要】
 * - 対象: urlState.ts (URLシリアライズおよび等価性判定)
 * - 条件: 部分状態・全指定状態・同一状態・差分状態を投入
 * - 期待結果: デフォルト値が除外されたクリーンなクエリ文字列が生成され、等価性判定が正確に行われること
 * - 関連文書: TC-ITb-0015, REQ-0024, SPEC-0019
 */
test('support: ITb-0015: urlState - 状態オブジェクトからクリーンなクエリ文字列生成および等価性判定が正確に行われること', () => {
  // 1. デフォルト状態はクリーンな空文字列になること
  const emptyQuery = serializeUrlState(DEFAULT_URL_STATE);
  assert.equal(emptyQuery, '', 'Default state should serialize to clean empty string');

  // 2. 指定された非デフォルト値のみがクエリに含まれること
  const partialQuery = serializeUrlState({
    tab: 'traceability',
    traceabilityView: 'graph',
    nodeId: 'REQ-0020',
    graphHighlight: 'downstream',
  });
  assert.ok(partialQuery.startsWith('?'));
  assert.ok(partialQuery.includes('view=graph'));
  assert.ok(!partialQuery.includes('tab=traceability'), 'Default traceability tab should be omitted');
  assert.ok(partialQuery.includes('node=REQ-0020'));
  assert.ok(partialQuery.includes('highlight=downstream'));
  assert.ok(!partialQuery.includes('phase='), 'Default phase should not be serialized');
  assert.ok(!partialQuery.includes('criticality='), 'Default criticality should not be serialized');
  assert.ok(!partialQuery.includes('reqclass='), 'Default requirement class should not be serialized');

  // 3. buildFullUrl がベースURLとクエリを正しく結合すること
  const fullUrl = buildFullUrl({ tab: 'stratum' }, 'https://example.com/app');
  assert.equal(fullUrl, 'https://example.com/app?tab=stratum');

  // 4. isUrlStateEqual による状態等価性判定
  const stateA: AppUrlState = { ...DEFAULT_URL_STATE, tab: 'decisions', catalogKind: 'decision' };
  const stateB: AppUrlState = { ...DEFAULT_URL_STATE, tab: 'decisions', catalogKind: 'decision' };
  const stateC: AppUrlState = { ...DEFAULT_URL_STATE, tab: 'decisions', catalogKind: 'requirement' };

  assert.ok(isUrlStateEqual(stateA, stateB), 'Identical states must be equal');
  assert.ok(!isUrlStateEqual(stateA, stateC), 'Different states must not be equal');
});

/**
 * 【テスト概要】
 * - 対象: URL 状態および履歴更新分類の公開契約
 * - 条件: ホーム状態と検索条件変更の分類関数を呼び出す
 * - 期待結果: URL 状態の初期値と履歴更新分類が契約どおり返ること
 * - 関連文書: TC-ITb-0015, REQ-0023, REQ-0024, SPEC-0019, DSN-0010
 */
test('support: ITb-0015: URL状態 - ホーム状態と検索条件変更の履歴更新分類契約', () => {
  const home = getHomeUrlState();
  assert.deepEqual(home, DEFAULT_URL_STATE);
  assert.equal(
    isOnlySearchQueryChanged({ ...home, searchQuery: 'before' }, { ...home, searchQuery: 'after' }),
    true
  );
  assert.equal(
    isOnlySearchQueryChanged(
      { ...home, searchQuery: 'before' },
      { ...home, searchQuery: 'after', phaseFilter: 'integration_internal' }
    ),
    false
  );
});

/**
 * 【テスト概要】
 * - 対象: V-model トレーサビリティ連鎖 (NEED-0008 -> REQ-0023, 0024 -> SPEC-0019 -> TC-ITb-0015)
 * - 条件: buildTraceWeaveReport を実行して有向グラフを検査
 * - 期待結果: 新設された要求・要件・仕様・テストケースの依存関係が正確に結合されていること
 * - 関連文書: TC-ITb-0015, NEED-0008, REQ-0023, REQ-0024, SPEC-0019
 */
test('support: ITb-0015: トレーサビリティ連鎖 - NEED-0008 から REQ-0023, REQ-0024, SPEC-0019, TC-ITb-0015 の双方向追跡の検証', () => {
  const { graph } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });

  // 1. NEED-0008
  const need0008 = graph.getNode('NEED-0008');
  assert.ok(need0008, 'NEED-0008 must exist');
  assert.equal(need0008?.kind, 'need');

  // 2. REQ-0023 & REQ-0024
  const req0023 = graph.getNode('REQ-0023');
  assert.ok(req0023, 'REQ-0023 must exist');
  assert.equal(req0023?.kind, 'requirement');
  assert.ok(req0023?.depends_on.includes('NEED-0008'), 'REQ-0023 must depend on NEED-0008');

  const req0024 = graph.getNode('REQ-0024');
  assert.ok(req0024, 'REQ-0024 must exist');
  assert.equal(req0024?.kind, 'requirement');
  assert.ok(req0024?.depends_on.includes('NEED-0008'), 'REQ-0024 must depend on NEED-0008');

  // 3. SPEC-0019
  const spec0019 = graph.getNode('SPEC-0019');
  assert.ok(spec0019, 'SPEC-0019 must exist');
  assert.equal(spec0019?.kind, 'specification');
  assert.ok(spec0019?.depends_on.includes('REQ-0023'), 'SPEC-0019 must depend on REQ-0023');
  assert.ok(spec0019?.depends_on.includes('REQ-0024'), 'SPEC-0019 must depend on REQ-0024');

  // 4. TC-ITb-0015
  const tc0019 = graph.getNode('TC-ITb-0015');
  assert.ok(tc0019, 'TC-ITb-0015 must exist');
  assert.equal(tc0019?.kind, 'test_case');
  assert.ok(tc0019?.verifies?.includes('REQ-0023'), 'TC-ITb-0015 must verify REQ-0023');
  assert.ok(tc0019?.verifies?.includes('REQ-0024'), 'TC-ITb-0015 must verify REQ-0024');
  assert.ok(tc0019?.verifies?.includes('SPEC-0019'), 'TC-ITb-0015 must verify SPEC-0019');
});
