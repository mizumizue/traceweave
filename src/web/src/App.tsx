import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TraceWeaveReport,
  DocNode,
  DecisionsCatalog,
} from '../../core/models/types.js';
import { Toaster, toast } from 'sonner';
import {
  parseUrlState,
  syncBrowserHistory,
  buildFullUrl,
  isUrlStateEqual,
  AppTab,
  TraceabilityView,
  GraphHighlightMode,
  AppUrlState,
  getHomeUrlState,
  isOnlySearchQueryChanged,
} from './utils/urlState.js';
import { DecisionsBrowser } from './components/DecisionsBrowser.js';
import { TraceabilityGraphView } from './components/TraceabilityGraphView.js';
import { PYRAMID_LAYERS } from './components/VisualTestPyramid.js';
import { Header, formatSubjectDocumentTitle } from './components/Header.js';
import { QualityMetricsGrid } from './components/QualityMetricsGrid.js';
import { TabNav } from './components/TabNav.js';
import { TraceabilityViewToggle } from './components/TraceabilityViewToggle.js';
import { MatrixView } from './components/MatrixView.js';
import { StratumView } from './components/StratumView.js';
import { UnitCoverageView } from './components/UnitCoverageView.js';
import { GapsView } from './components/GapsView.js';
import { Footer } from './components/Footer.js';
import { NodeDetailModal } from './components/NodeDetailModal.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { ErrorScreen } from './components/ErrorScreen.js';
import {
  filterMatrixRows,
  serializeMatrixCsv,
  serializeReportJson,
} from './utils/matrixData.js';

const EMPTY_CATALOG: DecisionsCatalog = {
  items: [],
  kindCounts: {
    need: 0,
    actor: 0,
    use_case: 0,
    glossary: 0,
    requirement: 0,
    specification: 0,
    design: 0,
    decision: 0,
    quality_assurance: 0,
    test_case: 0,
    total: 0,
  },
  requirementClassCounts: {
    functional: 0,
    non_functional: 0,
    unclassified: 0,
  },
  allTags: [],
  totalCount: 0,
};

export default function App() {
  const initialUrlState = useMemo(() => parseUrlState(), []);
  const [report, setReport] = useState<TraceWeaveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(initialUrlState.tab);
  const [traceabilityView, setTraceabilityView] = useState<TraceabilityView>(initialUrlState.traceabilityView);
  const [searchQuery, setSearchQuery] = useState(initialUrlState.searchQuery);
  const [phaseFilter, setPhaseFilter] = useState<string>(initialUrlState.phaseFilter);
  const [criticalityFilter, setCriticalityFilter] = useState<string>(initialUrlState.criticalityFilter);
  const [requirementClassFilter, setRequirementClassFilter] = useState<string>(initialUrlState.requirementClassFilter);
  const [scoreFilter, setScoreFilter] = useState<string>(initialUrlState.scoreFilter);
  const [catalogKind, setCatalogKind] = useState<string>(initialUrlState.catalogKind);
  const [catalogTag, setCatalogTag] = useState<string | null>(initialUrlState.catalogTag);
  const [catalogStatus, setCatalogStatus] = useState<string>(initialUrlState.catalogStatus);
  const [graphHighlight, setGraphHighlight] = useState<GraphHighlightMode>(initialUrlState.graphHighlight);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialUrlState.nodeId);
  const [unitCoverageFile, setUnitCoverageFile] = useState<string | null>(initialUrlState.unitCoverageFile);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isNavigatingFromPopstateRef = useRef(false);
  const lastSyncedStateRef = useRef<AppUrlState>(initialUrlState);
  const isInitialMountRef = useRef(true);

  // Fetch report data
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      let data: TraceWeaveReport;
      try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error('API request failed');
        data = await res.json();
      } catch {
        // Fallback: static data.json in dist-web
        const resStatic = await fetch('data.json');
        if (!resStatic.ok) throw new Error('Failed to fetch data.json');
        data = await resStatic.json();
      }
      setReport(data);
      setError(null);
      if (isManual) {
        toast.success('トレーサビリティデータを更新しました');
      }
    } catch (err: any) {
      const msg = 'トレーサビリティデータの取得に失敗しました: ' + err.message;
      setError(msg);
      if (isManual) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (report?.subject?.displayName) {
      document.title = formatSubjectDocumentTitle(report.subject.displayName);
    }
  }, [report?.subject?.displayName]);

  // Listen for browser back / forward (popstate event)
  useEffect(() => {
    const handlePopState = () => {
      isNavigatingFromPopstateRef.current = true;
      const parsed = parseUrlState();

      setActiveTab(parsed.tab);
      setTraceabilityView(parsed.traceabilityView);
      setSelectedNodeId(parsed.nodeId);
      setSearchQuery(parsed.searchQuery);
      setPhaseFilter(parsed.phaseFilter);
      setCriticalityFilter(parsed.criticalityFilter);
      setRequirementClassFilter(parsed.requirementClassFilter);
      setScoreFilter(parsed.scoreFilter);
      setCatalogKind(parsed.catalogKind);
      setCatalogTag(parsed.catalogTag);
      setCatalogStatus(parsed.catalogStatus);
      setGraphHighlight(parsed.graphHighlight);
      setUnitCoverageFile(parsed.unitCoverageFile);

      lastSyncedStateRef.current = parsed;

      requestAnimationFrame(() => {
        isNavigatingFromPopstateRef.current = false;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global keyboard shortcuts: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !selectedNodeId) {
        e.preventDefault();
        searchInputRef.current?.focus();
        toast.info('検索バーにフォーカスしました');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId]);

  // Map of all doc nodes for quick drill-down
  const nodeMap = useMemo(() => {
    const map = new Map<string, DocNode>();
    if (report?.nodes) {
      for (const node of report.nodes) {
        map.set(node.id, node);
      }
    }
    return map;
  }, [report]);

  // Validate initial selected node when data is loaded
  const hasValidatedInitialNodeRef = useRef(false);
  useEffect(() => {
    if (!loading && report && initialUrlState.nodeId && !hasValidatedInitialNodeRef.current) {
      hasValidatedInitialNodeRef.current = true;
      if (!nodeMap.has(initialUrlState.nodeId)) {
        toast.error(`指定されたノードが見つかりません: ${initialUrlState.nodeId}`);
        setSelectedNodeId(null);
      }
    }
  }, [loading, report, initialUrlState.nodeId, nodeMap]);

  // Current application URL state
  const currentState: AppUrlState = useMemo(
    () => ({
      tab: activeTab,
      traceabilityView,
      nodeId: selectedNodeId,
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
    }),
    [
      activeTab,
      traceabilityView,
      selectedNodeId,
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
    ]
  );

  // Synchronize state changes to browser URL and History API
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      lastSyncedStateRef.current = currentState;
      syncBrowserHistory(currentState, { replace: true });
      return;
    }

    if (isNavigatingFromPopstateRef.current) {
      return;
    }

    if (isUrlStateEqual(currentState, lastSyncedStateRef.current)) {
      return;
    }

    const prevState = lastSyncedStateRef.current;
    lastSyncedStateRef.current = currentState;

    syncBrowserHistory(currentState, { replace: isOnlySearchQueryChanged(prevState, currentState) });
  }, [currentState]);

  const catalogData = useMemo(() => report?.catalog ?? EMPTY_CATALOG, [report]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setPhaseFilter('all');
    setCriticalityFilter('all');
    setRequirementClassFilter('all');
    setScoreFilter('all');
    setCatalogKind('all');
    setCatalogTag(null);
    setCatalogStatus('all');
    setGraphHighlight('all');
    toast.info('すべてのフィルターを解除しました');
  };

  // Navigate to root (Header Logo click)
  const handleNavigateHome = () => {
    const home = getHomeUrlState();
    setActiveTab(home.tab);
    setTraceabilityView(home.traceabilityView);
    setSelectedNodeId(home.nodeId);
    setSearchQuery(home.searchQuery);
    setPhaseFilter(home.phaseFilter);
    setCriticalityFilter(home.criticalityFilter);
    setRequirementClassFilter(home.requirementClassFilter);
    setScoreFilter(home.scoreFilter);
    setCatalogKind(home.catalogKind);
    setCatalogTag(home.catalogTag);
    setCatalogStatus(home.catalogStatus);
    setGraphHighlight(home.graphHighlight);
  };

  const isFilterActive =
    searchQuery.trim() !== '' ||
    phaseFilter !== 'all' ||
    criticalityFilter !== 'all' ||
    requirementClassFilter !== 'all' ||
    scoreFilter !== 'all' ||
    catalogKind !== 'all' ||
    catalogTag !== null ||
    catalogStatus !== 'all' ||
    graphHighlight !== 'all';

  // Copy shareable URL (Toolbar: URL共有)
  const handleCopyShareUrl = () => {
    const fullUrl = buildFullUrl(currentState);
    navigator.clipboard.writeText(fullUrl);
    toast.success('現在の画面状態・フィルタのURLをコピーしました', {
      description: fullUrl,
    });
  };

  // Export handlers
  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([serializeReportJson(report)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traceweave-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('レポートJSONファイルをダウンロードしました');
  };

  const handleExportCsv = () => {
    if (!report) return;
    const blob = new Blob(['\uFEFF' + serializeMatrixCsv(report.matrix)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traceweave-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('マトリクスCSVファイルをダウンロードしました');
  };

  const handleCopySummaryMarkdown = () => {
    if (!report) return;
    const md = [
      `# TraceWeave 品質トレーサビリティ サマリー`,
      `- 契約充足度（ITa〜UAT）: **${report.summary.qualityAxes.traceability.overallScore}%**`,
      `- High要件充足率: **${report.summary.qualityAxes.traceability.highCriticalityCoverage}%**`,
      `- 実装網羅率（関数）: **${report.summary.qualityAxes.implementation.status === 'available' ? `${report.summary.qualityAxes.implementation.functionCoveragePercent}%` : 'pending'}**`,
      `- 実装網羅率（分岐）: **${report.summary.qualityAxes.implementation.status === 'available' ? `${report.summary.qualityAxes.implementation.branchCoveragePercent}%` : 'pending'}**`,
      `- 総要求 (Needs): ${report.summary.totalNeeds}`,
      `- 総要件 (Requirements): ${report.summary.totalRequirements}（FR ${report.summary.functionalRequirementCount} / NFR ${report.summary.nonFunctionalRequirementCount}）`,
      `- 総仕様 (Specs): ${report.summary.totalSpecifications}`,
      `- 総テストケース: ${report.summary.totalTestCases}（合格 ${report.summary.passedTestCaseCount} / 未実行 ${report.summary.pendingTestCaseCount} / 失敗 ${report.summary.failedTestCaseCount}）`,
      `- 実行合格テストのない要件: ${report.gaps.untestedRequirements.length}件 (${report.gaps.untestedRequirements.join(', ') || 'なし'})`,
      `- 結合テスト未実施: ${report.gaps.missingIntegrationRequirements.length}件`,
      `- ピラミッド診断: ${report.pyramid.status}`,
    ].join('\n');
    navigator.clipboard.writeText(md);
    toast.success('サマリーMarkdownをクリップボードにコピーしました');
  };

  // Modal navigation delegates for history traversal
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  };

  const handleForward = () => {
    if (typeof window !== 'undefined' && window.history) {
      window.history.forward();
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !report) {
    return <ErrorScreen error={error} onRetry={() => fetchData(true)} />;
  }

  // Filter matrix rows
  const filteredMatrix = filterMatrixRows(report.matrix, {
    searchQuery,
    criticality: criticalityFilter,
    requirementClass: requirementClassFilter,
    phase: phaseFilter,
    score: scoreFilter,
  });

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const totalGapsCount = report.gaps.untestedRequirements.length + report.gaps.missingIntegrationRequirements.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950">
      <div className={`mx-auto py-6 w-full space-y-6 transition-all ${activeTab === 'traceability' && traceabilityView === 'graph' ? 'max-w-[1920px] px-4 sm:px-8' : 'max-w-7xl px-4 sm:px-6'}`}>
        {/* Header with Quick Action Toolbar (更新, 要約コピー, URL共有, CSV, JSON) */}
        <Header
          isRefreshing={isRefreshing}
          subjectDisplayName={report.subject?.displayName}
          onRefresh={() => fetchData(true)}
          onCopySummaryMarkdown={handleCopySummaryMarkdown}
          onCopyShareUrl={handleCopyShareUrl}
          onExportCsv={handleExportCsv}
          onExportJson={handleExportJson}
          onNavigateHome={handleNavigateHome}
        />

        {/* Quality Sufficiency & Core Metrics Grid */}
        <QualityMetricsGrid
          summary={report.summary}
          highCriticalityCount={report.matrix.filter(r => r.criticality === 'high').length}
          onNavigateTab={(tab, msg) => {
            setActiveTab(tab);
            if (tab === 'traceability') {
              setTraceabilityView('matrix');
            }
            if (msg) toast.info(msg);
          }}
          onSelectRequirementClass={cls => {
            const next = requirementClassFilter === cls ? 'all' : cls;
            setRequirementClassFilter(next);
            setActiveTab('traceability');
            setTraceabilityView('matrix');
            if (next !== 'all') {
              toast.info(next === 'functional' ? '機能要件 (FR) で絞り込みました' : '非機能要件 (NFR) で絞り込みました');
            }
          }}
        />

        {/* Tab Navigation */}
        <TabNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          matrixCount={filteredMatrix.length}
          unitCoveragePercent={Math.round((report.unitCoverage?.functionCoverage ?? 0) * 100)}
          decisionsCount={catalogData.totalCount}
          totalGapsCount={totalGapsCount}
        />

        {activeTab === 'traceability' && (
          <TraceabilityViewToggle
            activeView={traceabilityView}
            onSelectView={setTraceabilityView}
            matrixCount={filteredMatrix.length}
            graphNodeCount={report?.nodes?.length ?? 0}
          />
        )}

        {activeTab === 'traceability' && traceabilityView === 'matrix' && (
          <MatrixView
            rows={filteredMatrix}
            totalMatrixCount={report.matrix.length}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            criticalityFilter={criticalityFilter}
            onCriticalityFilterChange={setCriticalityFilter}
            requirementClassFilter={requirementClassFilter}
            onRequirementClassFilterChange={setRequirementClassFilter}
            phaseFilter={phaseFilter}
            onPhaseFilterChange={setPhaseFilter}
            scoreFilter={scoreFilter}
            onScoreFilterChange={setScoreFilter}
            onResetFilters={handleResetFilters}
            isFilterActive={isFilterActive}
            onSelectNode={setSelectedNodeId}
            searchInputRef={searchInputRef}
          />
        )}

        {activeTab === 'traceability' && traceabilityView === 'graph' && (
          <div className="space-y-4 animate-fadeIn">
            <TraceabilityGraphView
              nodes={report.nodes || []}
              onSelectNode={id => setSelectedNodeId(id)}
              initialSelectedId={selectedNodeId}
              highlightMode={graphHighlight}
              onHighlightModeChange={mode => setGraphHighlight(mode)}
            />
          </div>
        )}

        {/* Tab 2: Stratum & Pyramid (VisualTestPyramid & Stratum Density Breakdown) */}
        {activeTab === 'stratum' && (
          <StratumView
            strata={report.strata}
            pyramid={report.pyramid}
            onFilterPhase={phase => {
              const next = phaseFilter === phase ? 'all' : phase;
              setPhaseFilter(next);
              setActiveTab('traceability');
              setTraceabilityView('matrix');
              if (next !== 'all') {
                const layer = PYRAMID_LAYERS.find(item => item.level === phase);
                if (layer) toast.info(`マトリクスを "${layer.name}" で絞り込みました`);
              }
            }}
          />
        )}

        {activeTab === 'unit' && report.unitCoverage && (
          <UnitCoverageView
            unitCoverage={report.unitCoverage}
            selectedFilePath={unitCoverageFile}
            onSelectFilePath={setUnitCoverageFile}
          />
        )}

        {/* Tab: Decisions Catalog (Architecture & Decisions) */}
        {activeTab === 'decisions' && (
          <DecisionsBrowser
            catalog={catalogData}
            useCaseSufficiencies={report.useCases}
            onSelectNode={id => setSelectedNodeId(id)}
            selectedKind={catalogKind as any}
            onKindChange={kind => setCatalogKind(kind)}
            selectedTag={catalogTag}
            onTagChange={tag => setCatalogTag(tag)}
            selectedStatus={catalogStatus as any}
            onStatusChange={status => setCatalogStatus(status)}
            selectedRequirementClass={requirementClassFilter}
            onRequirementClassChange={setRequirementClassFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}

        {/* Tab 3: Gaps & Risks */}
        {activeTab === 'gaps' && (
          <GapsView
            gaps={report.gaps}
            nodeMap={nodeMap}
            onSelectNode={setSelectedNodeId}
            onFilterInMatrix={reqId => {
              setSearchQuery(reqId);
              setActiveTab('traceability');
              setTraceabilityView('matrix');
              toast.info(`マトリクスで "${reqId}" を表示しました`);
            }}
          />
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* Detail Drill-down Modal */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          nodeMap={nodeMap}
          catalog={catalogData}
          requirements={report.requirements}
          useCases={report.useCases}
          onSelectNode={id => setSelectedNodeId(id)}
          onClose={() => setSelectedNodeId(null)}
          onBack={handleBack}
          onForward={handleForward}
        />
      )}

      {/* Sonner Toaster (Mounted Once at Root) */}
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        closeButton
        duration={3500}
      />
    </div>
  );
}
