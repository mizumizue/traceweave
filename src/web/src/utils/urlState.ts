/**
 * TraceWeave Web Dashboard URL State Management & History API Sync Utility
 * 
 * SPEC-0019 / DSN-0010 に基づき、URL クエリパラメータと SPA 内部状態の
 * 双方向同期およびブラウザ履歴スタック制御を提供する。
 */

export type AppTab = 'matrix' | 'graph' | 'stratum' | 'decisions' | 'gaps';
export type GraphHighlightMode = 'all' | 'upstream' | 'downstream';

export interface AppUrlState {
  tab: AppTab;
  nodeId: string | null;
  searchQuery: string;
  phaseFilter: string;
  criticalityFilter: string;
  scoreFilter: string;
  catalogKind: string;
  catalogTag: string | null;
  catalogStatus: string;
  graphHighlight: GraphHighlightMode;
}

export const VALID_TABS: readonly AppTab[] = ['matrix', 'graph', 'stratum', 'decisions', 'gaps'] as const;
export const VALID_GRAPH_HIGHLIGHTS: readonly GraphHighlightMode[] = ['all', 'upstream', 'downstream'] as const;
export const VALID_CRITICALITIES = ['all', 'high', 'medium', 'low'] as const;
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
  'requirement',
  'specification',
  'design',
  'decision',
  'quality_assurance',
  'test_case',
] as const;
export const VALID_STATUSES = ['all', 'draft', 'accepted', 'deprecated', 'superseded'] as const;

export const DEFAULT_URL_STATE: AppUrlState = {
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
};

/**
 * クエリ文字列または URL から AppUrlState をパースする。
 * 不正値は安全にデフォルト値へフォールバックする。
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

  // tab
  const rawTab = params.get('tab') as AppTab | null;
  const tab: AppTab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'matrix';

  // node
  const rawNode = params.get('node');
  const nodeId = rawNode && rawNode.trim() ? rawNode.trim() : null;

  // q (searchQuery)
  const searchQuery = params.get('q') || '';

  // phase
  const rawPhase = params.get('phase');
  const phaseFilter = rawPhase && (VALID_PHASES as readonly string[]).includes(rawPhase) ? rawPhase : 'all';

  // criticality
  const rawCriticality = params.get('criticality');
  const criticalityFilter =
    rawCriticality && (VALID_CRITICALITIES as readonly string[]).includes(rawCriticality)
      ? rawCriticality
      : 'all';

  // score
  const rawScore = params.get('score');
  const scoreFilter = rawScore && (VALID_SCORES as readonly string[]).includes(rawScore) ? rawScore : 'all';

  // catalogKind (kind)
  const rawKind = params.get('kind');
  const catalogKind = rawKind && (VALID_KINDS as readonly string[]).includes(rawKind) ? rawKind : 'all';

  // catalogTag (tag)
  const rawTag = params.get('tag');
  const catalogTag = rawTag && rawTag.trim() ? rawTag.trim() : null;

  // catalogStatus (status)
  const rawStatus = params.get('status');
  const catalogStatus =
    rawStatus && (VALID_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : 'all';

  // graphHighlight (highlight)
  const rawHighlight = params.get('highlight') as GraphHighlightMode | null;
  const graphHighlight: GraphHighlightMode =
    rawHighlight && VALID_GRAPH_HIGHLIGHTS.includes(rawHighlight) ? rawHighlight : 'all';

  return {
    tab,
    nodeId,
    searchQuery,
    phaseFilter,
    criticalityFilter,
    scoreFilter,
    catalogKind,
    catalogTag,
    catalogStatus,
    graphHighlight,
  };
}

/**
 * AppUrlState からクリーンなクエリ文字列（例: "?tab=graph&node=REQ-0001"）を生成する。
 * デフォルト値は URL を読みやすく保つため除外する。
 */
export function serializeUrlState(state: Partial<AppUrlState>): string {
  const merged: AppUrlState = { ...DEFAULT_URL_STATE, ...state };
  const params = new URLSearchParams();

  // tab (matrix はデフォルトなので省略可)
  if (merged.tab && merged.tab !== 'matrix') {
    params.set('tab', merged.tab);
  }

  // node
  if (merged.nodeId) {
    params.set('node', merged.nodeId);
  }

  // q
  if (merged.searchQuery && merged.searchQuery.trim()) {
    params.set('q', merged.searchQuery.trim());
  }

  // phase
  if (merged.phaseFilter && merged.phaseFilter !== 'all') {
    params.set('phase', merged.phaseFilter);
  }

  // criticality
  if (merged.criticalityFilter && merged.criticalityFilter !== 'all') {
    params.set('criticality', merged.criticalityFilter);
  }

  // score
  if (merged.scoreFilter && merged.scoreFilter !== 'all') {
    params.set('score', merged.scoreFilter);
  }

  // kind
  if (merged.catalogKind && merged.catalogKind !== 'all') {
    params.set('kind', merged.catalogKind);
  }

  // tag
  if (merged.catalogTag && merged.catalogTag.trim()) {
    params.set('tag', merged.catalogTag.trim());
  }

  // status
  if (merged.catalogStatus && merged.catalogStatus !== 'all') {
    params.set('status', merged.catalogStatus);
  }

  // highlight
  if (merged.graphHighlight && merged.graphHighlight !== 'all') {
    params.set('highlight', merged.graphHighlight);
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
    a.nodeId === b.nodeId &&
    a.searchQuery.trim() === b.searchQuery.trim() &&
    a.phaseFilter === b.phaseFilter &&
    a.criticalityFilter === b.criticalityFilter &&
    a.scoreFilter === b.scoreFilter &&
    a.catalogKind === b.catalogKind &&
    a.catalogTag === b.catalogTag &&
    a.catalogStatus === b.catalogStatus &&
    a.graphHighlight === b.graphHighlight
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

  // 現在のクエリ文字列と同一かつ force でない場合は何もしない
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
