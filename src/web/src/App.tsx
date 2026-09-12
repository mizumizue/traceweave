import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TraceWeaveReport,
  DocNode,
} from '../../core/models/types.js';
import { Toaster, toast } from 'sonner';
import {
  parseUrlState,
  syncBrowserHistory,
  buildFullUrl,
  isUrlStateEqual,
  AppTab,
  GraphHighlightMode,
  AppUrlState,
} from './utils/urlState.js';
import { DecisionsCatalogBuilder } from '../../core/decisions/DecisionsCatalogBuilder.js';
import { DecisionsBrowser } from './components/DecisionsBrowser.js';
import { TraceabilityGraphView } from './components/TraceabilityGraphView.js';
import { VisualTestPyramid } from './components/VisualTestPyramid.js';
import { Header } from './components/Header.js';
import { QualityMetricsGrid } from './components/QualityMetricsGrid.js';
import { TabNav } from './components/TabNav.js';
import { MatrixView } from './components/MatrixView.js';
import { StratumView } from './components/StratumView.js';
import { GapsView } from './components/GapsView.js';
import { Footer } from './components/Footer.js';
import { NodeDetailModal } from './components/NodeDetailModal.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { ErrorScreen } from './components/ErrorScreen.js';

export default function App() {
  const initialUrlState = useMemo(() => parseUrlState(), []);
  const [report, setReport] = useState<TraceWeaveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(initialUrlState.tab);
  const [searchQuery, setSearchQuery] = useState(initialUrlState.searchQuery);
  const [phaseFilter, setPhaseFilter] = useState<string>(initialUrlState.phaseFilter);
  const [criticalityFilter, setCriticalityFilter] = useState<string>(initialUrlState.criticalityFilter);
  const [scoreFilter, setScoreFilter] = useState<string>(initialUrlState.scoreFilter);
  const [catalogKind, setCatalogKind] = useState<string>(initialUrlState.catalogKind);
  const [catalogTag, setCatalogTag] = useState<string | null>(initialUrlState.catalogTag);
  const [catalogStatus, setCatalogStatus] = useState<string>(initialUrlState.catalogStatus);
  const [graphHighlight, setGraphHighlight] = useState<GraphHighlightMode>(initialUrlState.graphHighlight);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialUrlState.nodeId);
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

  // Listen for browser back / forward (popstate event)
  useEffect(() => {
    const handlePopState = () => {
      isNavigatingFromPopstateRef.current = true;
      const parsed = parseUrlState();

      setActiveTab(parsed.tab);
      setSelectedNodeId(parsed.nodeId);
      setSearchQuery(parsed.searchQuery);
      setPhaseFilter(parsed.phaseFilter);
      setCriticalityFilter(parsed.criticalityFilter);
      setScoreFilter(parsed.scoreFilter);
      setCatalogKind(parsed.catalogKind);
      setCatalogTag(parsed.catalogTag);
      setCatalogStatus(parsed.catalogStatus);
      setGraphHighlight(parsed.graphHighlight);

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
      nodeId: selectedNodeId,
      searchQuery,
      phaseFilter,
      criticalityFilter,
      scoreFilter,
      catalogKind,
      catalogTag,
      catalogStatus,
      graphHighlight,
    }),
    [
      activeTab,
      selectedNodeId,
      searchQuery,
      phaseFilter,
      criticalityFilter,
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

    const isOnlySearchQueryChanged =
      prevState.searchQuery !== currentState.searchQuery &&
      prevState.tab === currentState.tab &&
      prevState.nodeId === currentState.nodeId &&
      prevState.phaseFilter === currentState.phaseFilter &&
      prevState.criticalityFilter === currentState.criticalityFilter &&
      prevState.scoreFilter === currentState.scoreFilter &&
      prevState.catalogKind === currentState.catalogKind &&
      prevState.catalogTag === currentState.catalogTag &&
      prevState.catalogStatus === currentState.catalogStatus &&
      prevState.graphHighlight === currentState.graphHighlight;

    syncBrowserHistory(currentState, { replace: isOnlySearchQueryChanged });
  }, [currentState]);

  // Decisions catalog data (with fallback build)
  const catalogData = useMemo(() => {
    if (report?.catalog) {
      return report.catalog;
    }
    if (report?.nodes) {
      return DecisionsCatalogBuilder.build(report.nodes);
    }
    return {
      items: [],
      kindCounts: {
        need: 0,
        actor: 0,
        use_case: 0,
        requirement: 0,
        specification: 0,
        design: 0,
        decision: 0,
        quality_assurance: 0,
        test_case: 0,
        total: 0,
      },
      allTags: [],
      totalCount: 0,
    };
  }, [report]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setPhaseFilter('all');
    setCriticalityFilter('all');
    setScoreFilter('all');
    setCatalogKind('all');
    setCatalogTag(null);
    setCatalogStatus('all');
    setGraphHighlight('all');
    toast.info('すべてのフィルターを解除しました');
  };

  // Navigate to root (Header Logo click)
  const handleNavigateHome = () => {
    setActiveTab('matrix');
    setSelectedNodeId(null);
    setSearchQuery('');
    setPhaseFilter('all');
    setCriticalityFilter('all');
    setScoreFilter('all');
    setCatalogKind('all');
    setCatalogTag(null);
    setCatalogStatus('all');
    setGraphHighlight('all');
  };

  const isFilterActive =
    searchQuery.trim() !== '' ||
    phaseFilter !== 'all' ||
    criticalityFilter !== 'all' ||
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
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
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
    const header = 'Need ID,Requirement ID,Requirement Title,Criticality,Score,Specs,Test Cases\n';
    const rows = report.matrix.map(r => {
      const specs = `"${r.specs.map(s => s.id).join(';')}"`;
      const tests = `"${r.allTestCases.map(t => `${t.id}(${t.level})`).join(';')}"`;
      return `"${r.needId || ''}","${r.requirementId}","${r.requirementTitle}","${r.criticality}","${r.score}%",${specs},${tests}`;
    });
    const blob = new Blob(['\uFEFF' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
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
      `- 全体品質充足度: **${report.summary.overallSufficiencyScore}%**`,
      `- High要件充足率: **${report.summary.highCriticalityCoverage}%**`,
      `- 総要求 (Needs): ${report.summary.totalNeeds}`,
      `- 総要件 (Requirements): ${report.summary.totalRequirements}`,
      `- 総仕様 (Specs): ${report.summary.totalSpecifications}`,
      `- 総テストケース: ${report.summary.totalTestCases}`,
      `- 未テスト要件: ${report.gaps.untestedRequirements.length}件 (${report.gaps.untestedRequirements.join(', ') || 'なし'})`,
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
  const filteredMatrix = report.matrix.filter(row => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      row.requirementId.toLowerCase().includes(query) ||
      row.requirementTitle.toLowerCase().includes(query) ||
      (row.needId && row.needId.toLowerCase().includes(query)) ||
      (row.needTitle && row.needTitle.toLowerCase().includes(query)) ||
      row.specs.some(s => s.id.toLowerCase().includes(query) || s.title.toLowerCase().includes(query)) ||
      row.allTestCases.some(t => t.id.toLowerCase().includes(query) || t.title.toLowerCase().includes(query));

    const matchesCriticality = criticalityFilter === 'all' || row.criticality === criticalityFilter;

    const matchesPhase =
      phaseFilter === 'all' ||
      row.allTestCases.some(t => t.level === phaseFilter);

    const matchesScore =
      scoreFilter === 'all' ||
      (scoreFilter === 'satisfied' && row.score >= 80) ||
      (scoreFilter === 'partial' && row.score >= 50 && row.score < 80) ||
      (scoreFilter === 'unsatisfied' && row.score < 50);

    return matchesSearch && matchesCriticality && matchesPhase && matchesScore;
  });

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const totalGapsCount = report.gaps.untestedRequirements.length + report.gaps.missingIntegrationRequirements.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950">
      <div className={`mx-auto py-6 w-full space-y-6 transition-all ${activeTab === 'graph' ? 'max-w-[1920px] px-4 sm:px-8' : 'max-w-7xl px-4 sm:px-6'}`}>
        {/* Header with Quick Action Toolbar (更新, 要約コピー, URL共有, CSV, JSON) */}
        <Header
          isRefreshing={isRefreshing}
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
            if (msg) toast.info(msg);
          }}
        />

        {/* Tab Navigation */}
        <TabNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          matrixCount={filteredMatrix.length}
          graphNodeCount={report?.nodes?.length ?? 0}
          decisionsCount={catalogData.totalCount}
          totalGapsCount={totalGapsCount}
        />

        {/* Tab 1: Matrix */}
        {activeTab === 'matrix' && (
          <MatrixView
            rows={filteredMatrix}
            totalMatrixCount={report.matrix.length}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            criticalityFilter={criticalityFilter}
            onCriticalityFilterChange={setCriticalityFilter}
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

        {/* Tab: Traceability Graph */}
        {activeTab === 'graph' && (
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
              setPhaseFilter(phase);
              setActiveTab('matrix');
            }}
          />
        )}

        {/* Tab: Decisions Catalog (Architecture & Decisions) */}
        {activeTab === 'decisions' && (
          <DecisionsBrowser
            catalog={catalogData}
            onSelectNode={id => setSelectedNodeId(id)}
            selectedKind={catalogKind as any}
            onKindChange={kind => setCatalogKind(kind)}
            selectedTag={catalogTag}
            onTagChange={tag => setCatalogTag(tag)}
            selectedStatus={catalogStatus as any}
            onStatusChange={status => setCatalogStatus(status)}
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
              setActiveTab('matrix');
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
