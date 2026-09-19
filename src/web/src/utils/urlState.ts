/**
 * TraceWeave Web Dashboard URL State Management & History API Sync Utility
 *
 * SPEC-0019 / DSN-0010 に基づき、URL クエリパラメータと SPA 内部状態の
 * 双方向同期およびブラウザ履歴スタック制御を提供する。
 */

import type { TestLevel } from '../../../core/models/types.js';

export type TraceabilityView = 'matrix' | 'graph';
export type AppTab = 'traceability' | 'stratum' | 'testbooks' | 'decisions' | 'gaps';

export type TestBookLevel = TestLevel;

/** @deprecated Legacy tab values accepted in URLs for backward compatibility */
const LEGACY_TRACEABILITY_TABS = ['matrix', 'graph'] as const;

export interface AppUrlState {
  tab: AppTab;
  traceabilityView: TraceabilityView;
  nodeId: string | null;
  unitCoverageFile: string | null;
  searchQuery: string;
  phaseFilter: string;
  criticalityFilter: string;
  requirementClassFilter: string;
  scoreFilter: string;
  catalogKind: string;
  catalogTag: string | null;
  catalogStatus: string;
  graphHighlight: GraphHighlightMode;
  /** Active stratum when tab=testbooks (query: book=) */
  testBookLevel: TestBookLevel | null;
}

export type GraphHighlightMode = 'all' | 'upstream' | 'downstream';

export const VALID_TABS: readonly AppTab[] = [
  'traceability',
  'stratum',
  'testbooks',
  'decisions',
  'gaps',
] as const;

export const VALID_TEST_BOOK_LEVELS: readonly TestBookLevel[] = [
  'unit',
  'integration_internal',
  'integration_external',
  'system',
  'acceptance',
] as const;
export const VALID_TRACEABILITY_VIEWS: readonly TraceabilityView[] = ['matrix', 'graph'] as const;
export const VALID_GRAPH_HIGHLIGHTS: readonly GraphHighlightMode[] = ['all', 'upstream', 'downstream'] as const;
export const VALID_CRITICALITIES = ['all', 'high', 'medium', 'low'] as const;
export const VALID_REQUIREMENT_CLASSES = ['all', 'functional', 'non_functional'] as const;
export const VALID_SCORES = ['all', 'satisfied', 'partial', 'unsatisfied'] as const;
export const VALID_PHASES = [
  'all',
  'unit',
  'integration_internal',
  'integration_external',
  'system',
  'acceptance',
] as const;
export const VALID_KINDS = [
  'all',
  'need',
  'actor',
  'use_case',
  'glossary',
  'requirement',
  'specification',
  'design',
  'decision',
  'quality_assurance',
  'test_case',
] as const;
export const VALID_STATUSES = ['all', 'draft', 'accepted', 'deprecated', 'superseded'] as const;

export const DEFAULT_URL_STATE: AppUrlState = {
  tab: 'traceability',
  traceabilityView: 'matrix',
  nodeId: null,
  unitCoverageFile: null,
  searchQuery: '',
  phaseFilter: 'all',
  criticalityFilter: 'all',
  requirementClassFilter: 'all',
  scoreFilter: 'all',
  catalogKind: 'all',
  catalogTag: null,
  catalogStatus: 'all',
  graphHighlight: 'all',
  testBookLevel: null,
};

export function getHomeUrlState(): AppUrlState {
  return { ...DEFAULT_URL_STATE };
}

function parseTraceabilityView(rawView: string | null, legacyTab?: string | null): TraceabilityView {
  if (rawView && (VALID_TRACEABILITY_VIEWS as readonly string[]).includes(rawView)) {
    return rawView as TraceabilityView;
  }
  if (legacyTab === 'graph') {
    return 'graph';
  }
  return 'matrix';
}

function parseTab(rawTab: string | null): AppTab {
  if (rawTab === 'unit') {
    return 'testbooks';
  }
  if (rawTab && (VALID_TABS as readonly string[]).includes(rawTab)) {
    return rawTab as AppTab;
  }
  if (rawTab && (LEGACY_TRACEABILITY_TABS as readonly string[]).includes(rawTab as 'matrix' | 'graph')) {
    return 'traceability';
  }
  return 'traceability';
}

/**
 * クエリ文字列または URL から AppUrlState をパースする。
 * 不正値は安全にデフォルト値へフォールバックする。
 * `tab=matrix` / `tab=graph` は後方互換のため traceability + view に解釈する。
 */
export function parseUrlState(queryOrUrl?: string): AppUrlState {
  let searchStr = '';

  if (typeof queryOrUrl === 'string') {
    const qIndex = queryOrUrl.indexOf('?');
    searchStr = qIndex >= 0 ? queryOrUrl.slice(qIndex) : (queryOrUrl.startsWith('?') ? queryOrUrl : `?${queryOrUrl}`);
  } else if (typeof window !== 'undefined' && window.location) {
    searchStr = window.location.search;
  }

  const params = new URLSearchParams(searchStr);

  const rawTab = params.get('tab');
  const tab = parseTab(rawTab);
  const traceabilityView = parseTraceabilityView(params.get('view'), rawTab);

  const rawNode = params.get('node');
  const nodeId = rawNode && rawNode.trim() ? rawNode.trim() : null;

  const searchQuery = params.get('q') || '';

  const rawPhase = params.get('phase');
  const phaseFilter = rawPhase && (VALID_PHASES as readonly string[]).includes(rawPhase) ? rawPhase : 'all';

  const rawCriticality = params.get('criticality');
  const criticalityFilter =
    rawCriticality && (VALID_CRITICALITIES as readonly string[]).includes(rawCriticality)
      ? rawCriticality
      : 'all';

  const rawReqClass = params.get('reqclass');
  const requirementClassFilter =
    rawReqClass && (VALID_REQUIREMENT_CLASSES as readonly string[]).includes(rawReqClass)
      ? rawReqClass
      : 'all';

  const rawScore = params.get('score');
  const scoreFilter = rawScore && (VALID_SCORES as readonly string[]).includes(rawScore) ? rawScore : 'all';

  const rawKind = params.get('kind');
  const catalogKind = rawKind && (VALID_KINDS as readonly string[]).includes(rawKind) ? rawKind : 'all';

  const rawTag = params.get('tag');
  const catalogTag = rawTag && rawTag.trim() ? rawTag.trim() : null;

  const rawStatus = params.get('status');
  const catalogStatus =
    rawStatus && (VALID_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : 'all';

  const rawHighlight = params.get('highlight') as GraphHighlightMode | null;
  const graphHighlight: GraphHighlightMode =
    rawHighlight && VALID_GRAPH_HIGHLIGHTS.includes(rawHighlight) ? rawHighlight : 'all';

  const rawUnitFile = params.get('ucfile');
  const unitCoverageFile = rawUnitFile && rawUnitFile.trim() ? rawUnitFile.trim() : null;

  const rawBook = params.get('book');
  let testBookLevel: TestBookLevel | null =
    rawBook && (VALID_TEST_BOOK_LEVELS as readonly string[]).includes(rawBook)
      ? (rawBook as TestBookLevel)
      : null;
  if (tab === 'testbooks' && rawTab === 'unit' && !testBookLevel) {
    testBookLevel = 'unit';
  }

  return {
    tab,
    traceabilityView,
    nodeId,
    unitCoverageFile,
    searchQuery,
    phaseFilter,
    criticalityFilter,
    requirementClassFilter,
    scoreFilter,
    catalogKind,
    catalogTag,
    catalogStatus,
    graphHighlight,
    testBookLevel,
  };
}

/**
 * AppUrlState からクリーンなクエリ文字列（例: "?view=graph&node=REQ-0001"）を生成する。
 * デフォルト値は URL を読みやすく保つため除外する。
 */
export function serializeUrlState(state: Partial<AppUrlState>): string {
  const merged: AppUrlState = { ...DEFAULT_URL_STATE, ...state };
  const params = new URLSearchParams();

  if (merged.tab && merged.tab !== 'traceability') {
    params.set('tab', merged.tab);
  }

  if (
    merged.tab === 'traceability' &&
    merged.traceabilityView &&
    merged.traceabilityView !== 'matrix'
  ) {
    params.set('view', merged.traceabilityView);
  }

  if (merged.nodeId) {
    params.set('node', merged.nodeId);
  }

  if (merged.searchQuery && merged.searchQuery.trim()) {
    params.set('q', merged.searchQuery.trim());
  }

  if (merged.phaseFilter && merged.phaseFilter !== 'all') {
    params.set('phase', merged.phaseFilter);
  }

  if (merged.criticalityFilter && merged.criticalityFilter !== 'all') {
    params.set('criticality', merged.criticalityFilter);
  }

  if (merged.requirementClassFilter && merged.requirementClassFilter !== 'all') {
    params.set('reqclass', merged.requirementClassFilter);
  }

  if (merged.scoreFilter && merged.scoreFilter !== 'all') {
    params.set('score', merged.scoreFilter);
  }

  if (merged.catalogKind && merged.catalogKind !== 'all') {
    params.set('kind', merged.catalogKind);
  }

  if (merged.catalogTag && merged.catalogTag.trim()) {
    params.set('tag', merged.catalogTag.trim());
  }

  if (merged.catalogStatus && merged.catalogStatus !== 'all') {
    params.set('status', merged.catalogStatus);
  }

  if (merged.graphHighlight && merged.graphHighlight !== 'all') {
    params.set('highlight', merged.graphHighlight);
  }

  if (merged.tab === 'testbooks' && merged.unitCoverageFile) {
    params.set('ucfile', merged.unitCoverageFile);
  }

  if (merged.tab === 'testbooks' && merged.testBookLevel) {
    params.set('book', merged.testBookLevel);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * 完全な URL を生成する（共有用）。
 */
export function buildFullUrl(state: Partial<AppUrlState>, baseUrl?: string): string {
  const query = serializeUrlState(state);
  if (baseUrl) {
    const urlObj = new URL(baseUrl);
    urlObj.search = query;
    return urlObj.toString();
  }
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}${query}`;
  }
  return query || '/';
}

/**
 * 2つの AppUrlState が等価かどうかを判定する。
 */
export function isUrlStateEqual(a: AppUrlState, b: AppUrlState): boolean {
  return (
    a.tab === b.tab &&
    a.traceabilityView === b.traceabilityView &&
    a.nodeId === b.nodeId &&
    a.unitCoverageFile === b.unitCoverageFile &&
    a.searchQuery.trim() === b.searchQuery.trim() &&
    a.phaseFilter === b.phaseFilter &&
    a.criticalityFilter === b.criticalityFilter &&
    a.requirementClassFilter === b.requirementClassFilter &&
    a.scoreFilter === b.scoreFilter &&
    a.catalogKind === b.catalogKind &&
    a.catalogTag === b.catalogTag &&
    a.catalogStatus === b.catalogStatus &&
    a.graphHighlight === b.graphHighlight &&
    a.testBookLevel === b.testBookLevel
  );
}

export function isOnlySearchQueryChanged(previous: AppUrlState, current: AppUrlState): boolean {
  return (
    previous.searchQuery !== current.searchQuery &&
    previous.tab === current.tab &&
    previous.traceabilityView === current.traceabilityView &&
    previous.nodeId === current.nodeId &&
    previous.unitCoverageFile === current.unitCoverageFile &&
    previous.phaseFilter === current.phaseFilter &&
    previous.criticalityFilter === current.criticalityFilter &&
    previous.requirementClassFilter === current.requirementClassFilter &&
    previous.scoreFilter === current.scoreFilter &&
    previous.catalogKind === current.catalogKind &&
    previous.catalogTag === current.catalogTag &&
    previous.catalogStatus === current.catalogStatus &&
    previous.graphHighlight === current.graphHighlight
  );
}

/**
 * ブラウザの History API を呼び出して URL を同期する。
 */
export function syncBrowserHistory(
  state: AppUrlState,
  options: { replace?: boolean; force?: boolean } = {}
): void {
  if (typeof window === 'undefined' || !window.history || !window.location) {
    return;
  }

  const newQuery = serializeUrlState(state);
  const currentQuery = window.location.search || '';

  if (newQuery === currentQuery && !options.force) {
    return;
  }

  const newUrl = `${window.location.pathname}${newQuery}${window.location.hash || ''}`;

  try {
    const historyData = {
      traceweave: true,
      state,
      timestamp: Date.now(),
    };

    if (options.replace) {
      window.history.replaceState(historyData, '', newUrl);
    } else {
      window.history.pushState(historyData, '', newUrl);
    }
  } catch (err) {
    console.warn('[TraceWeave] History API sync failed:', err);
  }
}
