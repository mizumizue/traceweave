import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TraceWeaveReport,
  DocNode,
  TestLevel,
  TestExecutionStatus,
  RequirementSufficiency,
  TestRunResult,
  MatrixRow,
  DecisionsCatalog,
} from '../../core/models/types.js';
import { CircularGauge } from './components/CircularGauge.js';
import { InteractiveTestRunner } from './components/InteractiveTestRunner.js';
import { VisualTestPyramid } from './components/VisualTestPyramid.js';
import { DecisionsBrowser } from './components/DecisionsBrowser.js';
import { TraceabilityGraphView } from './components/TraceabilityGraphView.js';
import { DecisionsCatalogBuilder } from '../../core/decisions/DecisionsCatalogBuilder.js';
import { Toaster, toast } from 'sonner';
import {
  parseUrlState,
  serializeUrlState,
  syncBrowserHistory,
  buildFullUrl,
  isUrlStateEqual,
  AppTab,
  GraphHighlightMode,
  AppUrlState,
} from './utils/urlState.js';
import {
  Layers,
  TableProperties,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  FileText,
  Activity,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ClipboardCheck,
  Zap,
  PieChart as PieChartIcon,
  RefreshCw,
  Download,
  Copy,
  Check,
  X,
  SlidersHorizontal,
  RotateCcw,
  FileSpreadsheet,
  FileCode,
  Share2,
  FolderOpen,
  Compass,
  Network,
  Link as LinkIcon,
} from 'lucide-react';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1800);
    toast.success(`${label}をコピーしました: ${text}`);
  };

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

  const isFilterActive =
    searchQuery.trim() !== '' ||
    phaseFilter !== 'all' ||
    criticalityFilter !== 'all' ||
    scoreFilter !== 'all' ||
    catalogKind !== 'all' ||
    catalogTag !== null ||
    catalogStatus !== 'all' ||
    graphHighlight !== 'all';

  // Copy shareable URL
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="text-center p-8 rounded-2xl glass-panel max-w-sm border border-slate-800 shadow-2xl">
          <div className="text-5xl animate-bounce mb-4">🕸️</div>
          <div className="text-base font-bold text-slate-200">TraceWeave</div>
          <div className="text-slate-400 text-xs mt-1">品質トレーサビリティ データをロード中...</div>
          <div className="mt-4 flex justify-center">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-center shadow-2xl backdrop-blur-md">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <div className="text-lg font-bold text-rose-200">読み込みエラー</div>
          <p className="text-sm text-rose-300 mt-2">{error || 'データが空です'}</p>
          <div className="mt-4 p-3 bg-black/40 rounded-xl text-xs text-slate-400 text-left font-mono">
            <code>$ traceweave serve</code> または<br />
            <code>$ traceweave build --out ./dist-web</code>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="mt-5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 mx-auto transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 再試行する
          </button>
        </div>
      </div>
    );
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
        {/* Header */}
        <header className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          {/* Brand Identity & Subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl sm:text-3xl filter drop-shadow select-none shrink-0">🕸️</span>
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-tight shrink-0">
                TraceWeave
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-teal-950/80 text-teal-300 border border-teal-700/60 rounded-full font-semibold shadow-sm shrink-0">
                v0.1.0 Live Matrix
              </span>
              <span className="hidden xl:inline text-xs text-slate-400 font-normal border-l border-slate-800 pl-3 ml-1 truncate">
                要求からテストまでの一貫した縦糸 × 工程・手法の横糸で織りなすV字モデル品質トレーサビリティ
              </span>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shrink-0 shadow-sm">
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
              title="データを再読み込み"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
              <span className="hidden sm:inline">更新</span>
            </button>

            <button
              onClick={handleCopySummaryMarkdown}
              className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="Markdownサマリーをクリップボードにコピー"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">要約コピー</span>
            </button>

            <button
              onClick={handleCopyShareUrl}
              className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-teal-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="現在の画面状態・フィルタを含むURLをクリップボードにコピー"
            >
              <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">URL共有</span>
            </button>

            <div className="h-5 w-px bg-slate-800 mx-0.5" />

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="マトリクスをCSV形式でダウンロード"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="完全なレポートをJSON形式でダウンロード"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </header>

        {/* Quality Sufficiency & Core Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Global Sufficiency Score with Circular Gauges (5 cols on lg) */}
          <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800/90 px-5 py-3.5 rounded-2xl shadow-sm flex items-center justify-around gap-4 hover:border-slate-700/80 transition-all">
            <div className="flex items-center gap-3.5">
              <CircularGauge
                value={report.summary.overallSufficiencyScore}
                size={50}
                strokeWidth={4.5}
                label="全体品質充足度"
              />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  全体品質充足度
                </div>
                <div className="text-xl font-black text-teal-400 leading-none mt-1">
                  {report.summary.overallSufficiencyScore}%
                </div>
                <div className="mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    report.summary.overallSufficiencyScore >= 80
                      ? 'bg-teal-950/80 text-teal-300 border-teal-800/60'
                      : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                  }`}>
                    {report.summary.overallSufficiencyScore >= 80 ? '高充足' : '要改善'}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-800" />

            <div className="flex items-center gap-3.5">
              <CircularGauge
                value={report.summary.highCriticalityCoverage}
                size={50}
                strokeWidth={4.5}
                label="High要件充足率"
              />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  High要件充足率
                </div>
                <div
                  className={`text-xl font-black leading-none mt-1 ${
                    report.summary.highCriticalityCoverage >= 80 ? 'text-teal-400' : 'text-amber-400'
                  }`}
                >
                  {report.summary.highCriticalityCoverage}%
                </div>
                <div className="mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    report.summary.highCriticalityCoverage >= 80
                      ? 'bg-teal-950/80 text-teal-300 border-teal-800/60'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                  }`}>
                    {report.summary.highCriticalityCoverage >= 80 ? '完全カバー' : '欠落あり'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core Metrics Cards (7 cols on lg -> 4 equal cards) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl hover:border-slate-700 hover:bg-slate-900/80 transition-all shadow-sm flex flex-col justify-between">
              <div className="text-xs text-slate-400 flex items-center justify-between font-medium">
                <span className="truncate">要求 (NEED)</span>
                <span className="text-base shrink-0 ml-1">🎯</span>
              </div>
              <div className="text-2xl font-black text-slate-100 my-1 font-mono">
                {report.summary.totalNeeds}
              </div>
              <div className="text-[10px] text-slate-500 truncate">最上位ビジネス要求</div>
            </div>

            <div
              onClick={() => {
                setActiveTab('matrix');
                toast.info('マトリクスタブに切り替えました');
              }}
              className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl hover:border-slate-700 hover:bg-slate-900/80 transition-all shadow-sm cursor-pointer group flex flex-col justify-between"
            >
              <div className="text-xs text-slate-400 flex items-center justify-between font-medium">
                <span className="truncate">要件 (REQ)</span>
                <span className="text-base shrink-0 ml-1">📋</span>
              </div>
              <div className="text-2xl font-black text-teal-300 my-1 font-mono group-hover:text-teal-200 transition">
                {report.summary.totalRequirements}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                <span>High: {report.matrix.filter(r => r.criticality === 'high').length}件</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-teal-400 transition" />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl hover:border-slate-700 hover:bg-slate-900/80 transition-all shadow-sm flex flex-col justify-between">
              <div className="text-xs text-slate-400 flex items-center justify-between font-medium">
                <span className="truncate">仕様 (SPEC)</span>
                <span className="text-base shrink-0 ml-1">⚙️</span>
              </div>
              <div className="text-2xl font-black text-cyan-300 my-1 font-mono">
                {report.summary.totalSpecifications}
              </div>
              <div className="text-[10px] text-slate-500 truncate">設計・実装仕様</div>
            </div>

            <div
              onClick={() => {
                setActiveTab('stratum');
                toast.info('工程地層ピラミッド診断タブに切り替えました');
              }}
              className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl hover:border-slate-700 hover:bg-slate-900/80 transition-all shadow-sm cursor-pointer group flex flex-col justify-between"
            >
              <div className="text-xs text-slate-400 flex items-center justify-between font-medium">
                <span className="truncate">テスト (TEST)</span>
                <span className="text-base shrink-0 ml-1">🧪</span>
              </div>
              <div className="text-2xl font-black text-emerald-300 my-1 font-mono group-hover:text-emerald-200 transition">
                {report.summary.totalTestCases}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                <span>5工程観測中</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-400 transition" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center space-x-2 sm:space-x-3 border-b border-slate-800/80 pb-px overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveTab('matrix')}
            title="トレーサビリティマトリクス & 実測観測"
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all rounded-t-lg whitespace-nowrap shrink-0 ${
              activeTab === 'matrix'
                ? 'border-teal-400 text-teal-400 bg-slate-900/60 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <TableProperties className="w-4 h-4 shrink-0" />
            <span>
              <span className="hidden xl:inline">トレーサビリティ</span>マトリクス
            </span>
            <span className="ml-1 text-[11px] font-mono px-2 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-slate-300 shrink-0 leading-none">
              {filteredMatrix.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            title="トレーサビリティグラフ (Graph View)"
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all rounded-t-lg whitespace-nowrap shrink-0 ${
              activeTab === 'graph'
                ? 'border-indigo-400 text-indigo-400 bg-slate-900/60 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Network className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <span className="hidden xl:inline">トレーサビリティ</span>グラフ
            </span>
            <span className="ml-1 text-[11px] font-mono px-2 py-0.5 bg-indigo-950/80 border border-indigo-800/60 rounded-full text-indigo-300 font-bold shrink-0 leading-none">
              {report?.nodes?.length ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('stratum')}
            title="工程地層密度 & ピラミッド診断"
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all rounded-t-lg whitespace-nowrap shrink-0 ${
              activeTab === 'stratum'
                ? 'border-teal-400 text-teal-400 bg-slate-900/60 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>
              <span className="hidden lg:inline">テスト</span>ピラミッド
            </span>
            <span className="ml-1 text-[11px] font-mono px-2 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-slate-300 shrink-0 leading-none">
              5層
            </span>
          </button>

          <button
            onClick={() => setActiveTab('decisions')}
            title="決め事カタログ (Architecture & Decisions)"
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all rounded-t-lg whitespace-nowrap shrink-0 ${
              activeTab === 'decisions'
                ? 'border-indigo-400 text-indigo-400 bg-slate-900/60 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>決め事カタログ</span>
            <span className="ml-1 text-[11px] font-mono px-2 py-0.5 bg-indigo-950/80 border border-indigo-800/60 rounded-full text-indigo-300 font-bold shrink-0 leading-none">
              {catalogData.totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gaps')}
            title="品質ギャップ & 検出リスク一覧"
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all rounded-t-lg relative whitespace-nowrap shrink-0 ${
              activeTab === 'gaps'
                ? 'border-teal-400 text-teal-400 bg-slate-900/60 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>ギャップ & リスク</span>
            {totalGapsCount > 0 ? (
              <span className="ml-1 text-[11px] font-mono px-2 py-0.5 bg-rose-950/90 border border-rose-700/80 text-rose-300 rounded-full font-bold shrink-0 leading-none">
                {totalGapsCount}
              </span>
            ) : (
              <span className="ml-1 text-[11px] font-mono px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-full shrink-0 leading-none">
                0
              </span>
            )}
          </button>
        </nav>

        {/* Tab 1: Matrix */}
        {activeTab === 'matrix' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filters Bar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
              <div className="flex flex-col md:flex-row gap-3.5 items-stretch md:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="ID・キーワードで検索 ( / キー)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-200"
                      title="検索キーワードをクリア"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdowns */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400 text-[11px]">重要度:</span>
                    <select
                      value={criticalityFilter}
                      onChange={e => setCriticalityFilter(e.target.value)}
                      className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="all" className="bg-slate-900">すべて</option>
                      <option value="high" className="bg-slate-900">High</option>
                      <option value="medium" className="bg-slate-900">Medium</option>
                      <option value="low" className="bg-slate-900">Low</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <span className="text-slate-400 text-[11px]">工程:</span>
                    <select
                      value={phaseFilter}
                      onChange={e => setPhaseFilter(e.target.value)}
                      className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="all" className="bg-slate-900">すべての工程</option>
                      <option value="unit" className="bg-slate-900">単体 (UT)</option>
                      <option value="integration_internal" className="bg-slate-900">内結 (ITa)</option>
                      <option value="integration_external" className="bg-slate-900">外結 (ITb)</option>
                      <option value="system" className="bg-slate-900">総合 (ST)</option>
                      <option value="acceptance" className="bg-slate-900">受入 (UAT)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <span className="text-slate-400 text-[11px]">充足状況:</span>
                    <select
                      value={scoreFilter}
                      onChange={e => setScoreFilter(e.target.value)}
                      className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="all" className="bg-slate-900">すべて</option>
                      <option value="satisfied" className="bg-slate-900">充足 (80%以上)</option>
                      <option value="partial" className="bg-slate-900">一部充足 (50-79%)</option>
                      <option value="unsatisfied" className="bg-slate-900">未充足 (50%未満)</option>
                    </select>
                  </div>

                  {isFilterActive && (
                    <button
                      onClick={handleResetFilters}
                      className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition border border-slate-700/60"
                      title="全フィルターをリセット"
                    >
                      <RotateCcw className="w-3 h-3 text-teal-400" />
                      <span>リセット</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick filter pill chips */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">クイック条件:</span>
                  <button
                    onClick={() => {
                      setCriticalityFilter('high');
                      toast.info('High重要度要件で絞り込みました');
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      criticalityFilter === 'high'
                        ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    High要件のみ
                  </button>

                  <button
                    onClick={() => {
                      setScoreFilter('unsatisfied');
                      toast.info('要改善要件で絞り込みました');
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      scoreFilter === 'unsatisfied'
                        ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    未充足 (&lt;50%)
                  </button>

                  <button
                    onClick={() => {
                      setPhaseFilter('unit');
                      toast.info('単体テスト (UT) で絞り込みました');
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      phaseFilter === 'unit'
                        ? 'bg-teal-950 text-teal-300 border-teal-700 font-bold'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    単体テスト (UT)
                  </button>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  表示中: <strong className="text-teal-400 font-bold">{filteredMatrix.length}</strong> / {report.matrix.length} 要件
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            {filteredMatrix.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Search className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-base font-bold text-slate-300">一致する要件が見つかりませんでした</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  検索条件またはフィルターを変更するか、以下のボタンからフィルターをリセットしてください。
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> フィルターを全解除する
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm table-fixed">
                    <thead className="bg-slate-800/90 text-slate-300 text-xs font-semibold tracking-wider sticky top-0 backdrop-blur-md z-10 border-b border-slate-700/60">
                      <tr>
                        <th className="py-3.5 px-4 pl-5 whitespace-nowrap w-[38%]">要求 / 要件</th>
                        <th className="py-3.5 px-4 whitespace-nowrap w-[7%]">重要度</th>
                        <th className="py-3.5 px-4 whitespace-nowrap w-[13%]">
                          <div className="flex items-center gap-1.5">
                            <PieChartIcon className="w-3.5 h-3.5 text-teal-400" />
                            <span>品質充足度</span>
                          </div>
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap w-[12%]">仕様ノード</th>
                        <th className="py-3.5 px-4 whitespace-nowrap w-[30%]">検証テストケース</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredMatrix.map(row => (
                        <tr
                          key={row.requirementId}
                          className="hover:bg-slate-800/40 transition group"
                        >
                          {/* Need / Requirement */}
                          <td className="p-4 pl-5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedNodeId(row.requirementId)}
                                className="font-bold text-slate-100 hover:text-teal-300 transition text-left flex items-center gap-1 group/btn font-mono shrink-0"
                                title="クリックで要件詳細を開く"
                              >
                                <span>{row.requirementId}</span>
                                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/btn:opacity-100 text-teal-400 transition" />
                              </button>

                              <button
                                onClick={() => handleCopy(row.requirementId, '要件ID')}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition p-0.5 rounded shrink-0"
                                title="要件IDをコピー"
                              >
                                {copiedId === row.requirementId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>

                              {row.needId && (
                                <button
                                  onClick={() => setSelectedNodeId(row.needId!)}
                                  className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700/70 transition shrink-0"
                                  title={`${row.needId}: ${row.needTitle}`}
                                >
                                  {row.needId}
                                </button>
                              )}
                            </div>
                            <div
                              onClick={() => setSelectedNodeId(row.requirementId)}
                              className="text-xs text-slate-400 mt-1 line-clamp-2 cursor-pointer hover:text-slate-200 transition leading-relaxed [line-break:strict]"
                            >
                              {row.requirementTitle}
                            </div>
                          </td>

                          {/* Criticality */}
                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                                row.criticality === 'high'
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                                  : row.criticality === 'medium'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {row.criticality}
                            </span>
                          </td>

                          {/* Score Circular Gauge */}
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <CircularGauge
                                value={row.score}
                                size={40}
                                strokeWidth={4.5}
                                label={`要件 ${row.requirementId} 充足率`}
                              />
                              <div className="flex flex-col">
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    row.score >= 80
                                      ? 'text-teal-400'
                                      : row.score >= 50
                                      ? 'text-amber-400'
                                      : 'text-rose-400'
                                  }`}
                                >
                                  {row.score}%
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {row.score >= 80 ? '高充足' : row.score >= 50 ? '一部充足' : '未充足'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Associated Specs */}
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                              {row.specs.length > 0 ? (
                                row.specs.map(spec => (
                                  <button
                                    key={spec.id}
                                    onClick={() => setSelectedNodeId(spec.id)}
                                    title={`${spec.id}: ${spec.title} (クリックで仕様を表示)`}
                                    className="px-2 py-0.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 hover:text-teal-300 transition font-mono"
                                  >
                                    {spec.id}
                                  </button>
                                ))
                              ) : (
                                <span className="text-slate-600 text-xs italic">なし</span>
                              )}
                            </div>
                          </td>

                          {/* Test Cases */}
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                              {row.allTestCases.length > 0 ? (
                                row.allTestCases.map(tc => {
                                  const status = tc.execution_status || 'pending';
                                  const statusIcon =
                                    status === 'passed' ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : status === 'failed' ? (
                                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    );

                                  const badgeStyle =
                                    status === 'passed'
                                      ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/60'
                                      : status === 'failed'
                                      ? 'bg-rose-950/40 border-rose-800/70 text-rose-300 hover:bg-rose-900/60'
                                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700';

                                  return (
                                    <button
                                      key={tc.id}
                                      onClick={() => setSelectedNodeId(tc.id)}
                                      className={`px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 hover:scale-105 active:scale-95 transition shadow-sm ${badgeStyle}`}
                                      title={`${tc.id}: ${tc.title} - クリックで実測値・期待値を観測`}
                                    >
                                      {statusIcon}
                                      <strong className="font-mono">{tc.id}</strong>
                                      <span className="text-[10px] opacity-75 font-mono uppercase bg-black/30 px-1 py-0.2 rounded">
                                        {tc.level === 'integration_internal'
                                          ? 'ITa'
                                          : tc.level === 'integration_external'
                                          ? 'ITb'
                                          : tc.level === 'unit'
                                          ? 'UT'
                                          : tc.level === 'system'
                                          ? 'ST'
                                          : tc.level === 'acceptance'
                                          ? 'UAT'
                                          : tc.level}
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> 未テスト
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
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

        {/* Tab 2: Stratum & Pyramid */}
        {activeTab === 'stratum' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Visual Interactive Pyramid */}
            <VisualTestPyramid
              strata={report.strata}
              pyramid={report.pyramid}
              onFilterPhase={phase => {
                setPhaseFilter(phase);
                setActiveTab('matrix');
              }}
            />

            {/* Stratum Density Heatmap Cards */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-slate-100 mb-1.5 flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                <span>各工程地層の詳細データ (Stratum Density Breakdown)</span>
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                各開発工程（単体・内結・外結・総合・受入）におけるテストケース数・要件カバー率・地層密度を個別に分析します。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                {report.strata.map(s => {
                  const densityColors = {
                    heavy: 'bg-teal-950/50 border-teal-500/70 text-teal-300',
                    adequate: 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300',
                    thin: 'bg-amber-950/50 border-amber-600/60 text-amber-300',
                    missing: 'bg-rose-950/50 border-rose-600/60 text-rose-300',
                  };

                  const densityLabels = {
                    heavy: '厚い (Heavy)',
                    adequate: '適正 (Adequate)',
                    thin: '薄い (Thin)',
                    missing: '欠落 (Missing)',
                  };

                  return (
                    <div
                      key={s.level}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:-translate-y-1 shadow-md ${
                        densityColors[s.density]
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">{s.label}</div>
                        <div className="text-3xl font-black mt-2 font-mono">{s.count}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">件のテストケース</div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-current/20 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] opacity-80">要件カバー率</div>
                          <div className="text-sm font-black mt-0.5 font-mono">
                            {Math.round(s.coverageRatio * 100)}%
                          </div>
                          <div className="text-[10px] font-bold mt-1 uppercase px-1.5 py-0.5 bg-black/40 rounded inline-block">
                            {densityLabels[s.density]}
                          </div>
                        </div>
                        <CircularGauge
                          value={Math.round(s.coverageRatio * 100)}
                          size={46}
                          strokeWidth={4.5}
                          strokeColor={
                            s.density === 'heavy'
                              ? '#2dd4bf'
                              : s.density === 'adequate'
                              ? '#34d399'
                              : s.density === 'thin'
                              ? '#fbbf24'
                              : '#fb7185'
                          }
                          label={`${s.label} 要件カバー率`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
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
          <div className="space-y-6 animate-fadeIn">
            {/* Risk Overview Banner */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">
                      品質ギャップ & 検出リスク一覧
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      V字モデルにおける未検証要件や結合テスト不足を検出し、リリース前に対処すべき課題を提示します。
                    </p>
                  </div>
                </div>

                {totalGapsCount > 0 && (
                  <button
                    onClick={() => {
                      const tasks = [
                        `# TraceWeave 残課題タスクリスト`,
                        ...report.gaps.untestedRequirements.map(id => `- [ ] ${id}: 単体/総合テストケースの作成`),
                        ...report.gaps.missingIntegrationRequirements.map(id => `- [ ] ${id}: 結合テスト (ITa/ITb) の作成`),
                      ].join('\n');
                      handleCopy(tasks, '未対応タスクリスト');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5 text-teal-400" />
                    <span>課題リストをコピー</span>
                  </button>
                )}
              </div>

              {/* Two Column Risk Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 1. Untested Requirements */}
                <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-rose-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span>未テスト要件 (Untested Requirements)</span>
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 bg-rose-950 text-rose-300 rounded-full border border-rose-800/80">
                      {report.gaps.untestedRequirements.length} 件
                    </span>
                  </div>

                  {report.gaps.untestedRequirements.length > 0 ? (
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      {report.gaps.untestedRequirements.map(reqId => {
                        const node = nodeMap.get(reqId);
                        return (
                          <li
                            key={reqId}
                            className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedNodeId(reqId)}
                                  className="font-bold font-mono text-rose-300 hover:underline"
                                >
                                  {reqId}
                                </button>
                                {node?.criticality && (
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-rose-950 text-rose-400 rounded border border-rose-900">
                                    {node.criticality}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {node?.title || '要件定義'}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSearchQuery(reqId);
                                setActiveTab('matrix');
                                toast.info(`マトリクスで "${reqId}" を表示しました`);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded text-[11px] font-semibold transition shrink-0"
                            >
                              マトリクスで確認
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs text-teal-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>全ての要件に1件以上のテストケースが紐づいています。</span>
                    </div>
                  )}
                </div>

                {/* 2. Missing Integration Tests */}
                <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>結合テスト未実施要件 (Missing Integration Tests)</span>
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 bg-amber-950 text-amber-300 rounded-full border border-amber-800/80">
                      {report.gaps.missingIntegrationRequirements.length} 件
                    </span>
                  </div>

                  {report.gaps.missingIntegrationRequirements.length > 0 ? (
                    <ul className="space-y-2.5 text-xs text-slate-300 max-h-72 overflow-y-auto pr-1">
                      {report.gaps.missingIntegrationRequirements.map(reqId => {
                        const node = nodeMap.get(reqId);
                        return (
                          <li
                            key={reqId}
                            className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedNodeId(reqId)}
                                  className="font-bold font-mono text-amber-300 hover:underline"
                                >
                                  {reqId}
                                </button>
                                {node?.criticality && (
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-amber-950 text-amber-400 rounded border border-amber-900">
                                    {node.criticality}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {node?.title || '要件定義'}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSearchQuery(reqId);
                                setActiveTab('matrix');
                                toast.info(`マトリクスで "${reqId}" を表示しました`);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-semibold transition shrink-0"
                            >
                              マトリクスで確認
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs text-teal-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>全要件で内部結合 (ITa) または外部結合 (ITb) テストが充足しています。</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 py-5 border-t border-slate-900 text-center text-xs text-slate-500 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TraceWeave — V-Model Traceability Matrix & Test Stratum Analyzer</span>
          <span className="text-[11px] font-mono">ショートカット: [ / ] 検索フォーカス | [ Esc ] モーダルを閉じる</span>
        </div>
      </footer>

      {/* Detail Drill-down Modal */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          nodeMap={nodeMap}
          catalog={catalogData}
          requirements={report.requirements}
          onSelectNode={id => setSelectedNodeId(id)}
          onClose={() => setSelectedNodeId(null)}
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

// -----------------------------------------------------------------------------
// Upgraded Node Detail Modal with History & Full Copy Support
// -----------------------------------------------------------------------------

interface NodeDetailModalProps {
  node: DocNode;
  nodeMap: Map<string, DocNode>;
  catalog?: DecisionsCatalog;
  requirements?: RequirementSufficiency[];
  onSelectNode: (id: string) => void;
  onClose: () => void;
}

function NodeDetailModal({ node, nodeMap, catalog, requirements, onSelectNode, onClose }: NodeDetailModalProps) {
  const isTestCase = node.kind === 'test_case';
  const isRequirement = node.kind === 'requirement';
  const reqSufficiency = isRequirement && requirements ? requirements.find(r => r.requirementId === node.id) : null;
  const catalogItem = catalog?.items.find(i => i.id === node.id);
  const [liveRunResult, setLiveRunResult] = useState<TestRunResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // History stack for back/forward navigation within the modal
  const [history, setHistory] = useState<string[]>([node.id]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // When external node prop changes from outside
  useEffect(() => {
    if (history[historyIndex] !== node.id) {
      setHistory(prev => [...prev.slice(0, historyIndex + 1), node.id]);
      setHistoryIndex(prev => prev + 1);
    }
  }, [node.id]);

  const handleNavigate = (targetId: string) => {
    onSelectNode(targetId);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      if (typeof window !== 'undefined' && window.history) {
        window.history.back();
      } else {
        const prevId = history[historyIndex - 1];
        setHistoryIndex(historyIndex - 1);
        onSelectNode(prevId);
      }
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      if (typeof window !== 'undefined' && window.history) {
        window.history.forward();
      } else {
        const nextId = history[historyIndex + 1];
        setHistoryIndex(historyIndex + 1);
        onSelectNode(nextId);
      }
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const effectiveStatus = liveRunResult ? liveRunResult.status : (node.execution_status || 'pending');

  const copyToClipboard = (text: string, label: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
    toast.success(`${label}をコピーしました`);
  };

  const kindBadgeColors: Record<string, string> = {
    need: 'bg-pink-950 text-pink-300 border-pink-700/60',
    requirement: 'bg-emerald-950 text-emerald-300 border-emerald-700/60',
    specification: 'bg-cyan-950 text-cyan-300 border-cyan-700/60',
    design: 'bg-indigo-950 text-indigo-300 border-indigo-700/60',
    decision: 'bg-amber-950 text-amber-300 border-amber-700/60',
    quality_assurance: 'bg-teal-950 text-teal-300 border-teal-700/60',
    test_case: 'bg-purple-950 text-purple-300 border-purple-700/60',
    actor: 'bg-blue-950 text-blue-300 border-blue-700/60',
    use_case: 'bg-violet-950 text-violet-300 border-violet-700/60',
  };

  const statusBadge =
    effectiveStatus === 'passed' ? (
      <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-600 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASSED (合格)
      </span>
    ) : effectiveStatus === 'failed' ? (
      <span className="px-2.5 py-1 bg-rose-950 border border-rose-600 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
        <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAILED (不合格)
      </span>
    ) : (
      <span className="px-2.5 py-1 bg-amber-950 border border-amber-600 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
        <Clock className="w-3.5 h-3.5 text-amber-400" /> PENDING (保留)
      </span>
    );

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-modalPop"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/80 gap-3">
          <div className="space-y-1.5 flex-1 pr-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Back / Forward navigation */}
              <div className="flex items-center gap-1 mr-1">
                <button
                  onClick={handleBack}
                  disabled={historyIndex === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="戻る"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="進む"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span
                className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${
                  kindBadgeColors[node.kind] || 'bg-slate-800 text-slate-300'
                }`}
              >
                {node.kind}
              </span>

              <div className="flex items-center gap-1">
                <span className="text-xl font-bold font-mono text-slate-100">{node.id}</span>
                <button
                  onClick={() => copyToClipboard(node.id, 'ID', 'modal-id')}
                  className="text-slate-500 hover:text-slate-200 p-1 rounded transition"
                  title="IDをコピー"
                >
                  {copiedKey === 'modal-id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {isTestCase && statusBadge}
            </div>

            <h2 className="text-base font-bold text-slate-200 leading-snug">{node.title}</h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {reqSufficiency && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
                <CircularGauge
                  value={reqSufficiency.score}
                  size={42}
                  strokeWidth={4}
                  label="要件品質充足率"
                />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">品質充足度</div>
                  <div className="text-xs font-bold text-slate-200">
                    {reqSufficiency.isFullySatisfied ? '充足' : '未完全'}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                const fullUrl = buildFullUrl({ nodeId: node.id });
                navigator.clipboard.writeText(fullUrl);
                toast.success(`${node.id} の共有URLをコピーしました`, {
                  description: fullUrl,
                });
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white flex items-center gap-1 text-xs transition border border-slate-700/60"
              title="このノードの共有URLをコピー"
            >
              <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">URL</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center font-bold text-sm transition"
              title="閉じる (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">ステータス</span>
              <span className="font-medium text-slate-200 mt-0.5 block capitalize">{node.status}</span>
            </div>
            {node.criticality && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">重要度</span>
                <span className="font-bold text-amber-400 mt-0.5 block uppercase">{node.criticality}</span>
              </div>
            )}
            {node.test_level && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">テスト工程</span>
                <span className="font-bold text-teal-400 mt-0.5 block uppercase">{node.test_level}</span>
              </div>
            )}
            {node.test_method && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">テスト手法</span>
                <span className="font-bold text-blue-400 mt-0.5 block uppercase">{node.test_method}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">作成日 / 更新日</span>
              <span className="text-slate-400 mt-0.5 block font-mono">
                {node.created} {node.updated && `/ ${node.updated}`}
              </span>
            </div>
          </div>

          {/* Traceability & Cross-Cutting Connections */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-teal-400" />
              <span>トレーサビリティ & 横断決め事接続 (Relationships)</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {node.depends_on && node.depends_on.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">依存先 (depends_on):</span>
                  {node.depends_on.map(depId => (
                    <button
                      key={depId}
                      onClick={() => handleNavigate(depId)}
                      className="text-cyan-400 hover:underline font-mono font-bold hover:text-cyan-300 transition"
                      title="このノードへ移動"
                    >
                      {depId}
                    </button>
                  ))}
                </div>
              )}
              {node.verifies && node.verifies.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">検証対象 (verifies):</span>
                  {node.verifies.map(vId => (
                    <button
                      key={vId}
                      onClick={() => handleNavigate(vId)}
                      className="text-emerald-400 hover:underline font-mono font-bold hover:text-emerald-300 transition"
                      title="このノードへ移動"
                    >
                      {vId}
                    </button>
                  ))}
                </div>
              )}
              {/* Related Actors */}
              {catalogItem?.relatedActors && catalogItem.relatedActors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-violet-900/60">
                  <span className="text-violet-400">👤 アクター:</span>
                  {catalogItem.relatedActors.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => handleNavigate(ref.id)}
                      className="text-violet-300 hover:underline font-mono font-bold hover:text-violet-200 transition"
                      title={`${ref.title} (${ref.id})`}
                    >
                      {ref.id}
                    </button>
                  ))}
                </div>
              )}
              {/* Related Use Cases */}
              {catalogItem?.relatedUseCases && catalogItem.relatedUseCases.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-indigo-900/60">
                  <span className="text-indigo-400">🎯 ユースケース:</span>
                  {catalogItem.relatedUseCases.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => handleNavigate(ref.id)}
                      className="text-indigo-300 hover:underline font-mono font-bold hover:text-indigo-200 transition"
                      title={`${ref.title} (${ref.id})`}
                    >
                      {ref.id}
                    </button>
                  ))}
                </div>
              )}
              {/* Related Decisions (ADR) */}
              {catalogItem?.relatedDecisions && catalogItem.relatedDecisions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-amber-900/60">
                  <span className="text-amber-400">⚖️ 意思決定 (ADR):</span>
                  {catalogItem.relatedDecisions.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => handleNavigate(ref.id)}
                      className="text-amber-300 hover:underline font-mono font-bold hover:text-amber-200 transition"
                      title={`${ref.title} (${ref.id})`}
                    >
                      {ref.id}
                    </button>
                  ))}
                </div>
              )}
              {/* Related Designs */}
              {catalogItem?.relatedDesigns && catalogItem.relatedDesigns.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-blue-900/60">
                  <span className="text-blue-400">🏗️ 設計 (DSN):</span>
                  {catalogItem.relatedDesigns.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => handleNavigate(ref.id)}
                      className="text-blue-300 hover:underline font-mono font-bold hover:text-blue-200 transition"
                      title={`${ref.title} (${ref.id})`}
                    >
                      {ref.id}
                    </button>
                  ))}
                </div>
              )}
              {/* Direct links if any */}
              {node.links && node.links.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">リンク (links):</span>
                  {node.links.map(linkId => (
                    <button
                      key={linkId}
                      onClick={() => handleNavigate(linkId)}
                      className="text-slate-300 hover:underline font-mono font-bold hover:text-white transition"
                      title="このノードへ移動"
                    >
                      {linkId}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Test Case Details */}
          {isTestCase ? (
            <div className="space-y-5">
              {/* Scope & Procedure */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-teal-400" />
                  何をテストするのか (Test Scope & Procedure)
                </div>

                {node.sections?.['Objective'] && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">検証目的 (Objective)</div>
                    <p className="text-sm text-slate-200 mt-1 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      {node.sections['Objective']}
                    </p>
                  </div>
                )}

                {node.sections?.['Preconditions'] && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">前提条件 (Preconditions)</div>
                    <div className="text-xs text-slate-300 mt-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 font-mono">
                      {node.sections['Preconditions']}
                    </div>
                  </div>
                )}

                {node.sections?.['Steps'] && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">実施手順 (Steps)</div>
                    <div className="text-xs text-slate-300 mt-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
                      {node.sections['Steps']}
                    </div>
                  </div>
                )}
              </div>

              {/* Expected Results vs Actual Results */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  期待値と実測値の観測対比 (Expected vs Actual Observation)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Expected Card */}
                  <div className="bg-teal-950/20 border border-teal-800/60 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-teal-800/40">
                        <span className="text-xs font-bold text-teal-300 uppercase">期待値 (Expected)</span>
                        <span className="text-[10px] font-mono text-teal-400/80">SPEC CRITERIA</span>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {node.sections?.['Expected Results'] || '期待値の定義なし'}
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-teal-800/30 text-[10px] text-teal-400">
                      ✔ 仕様要求に合致する振る舞い
                    </div>
                  </div>

                  {/* Actual Card */}
                  <div
                    className={`rounded-xl p-4 flex flex-col justify-between border ${
                      effectiveStatus === 'passed'
                        ? 'bg-emerald-950/20 border-emerald-700/60'
                        : effectiveStatus === 'failed'
                        ? 'bg-rose-950/20 border-rose-700/60'
                        : 'bg-amber-950/20 border-amber-700/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/20">
                        <span className="text-xs font-bold uppercase text-slate-200">
                          実測値 (Actual Results) {liveRunResult && <span className="text-[10px] text-teal-400 font-normal">● Live Run</span>}
                        </span>
                        {statusBadge}
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono bg-black/30 p-2.5 rounded-lg border border-current/20">
                        {liveRunResult
                          ? JSON.stringify(liveRunResult.actual, null, 2)
                          : node.sections?.['Actual Results'] || node.actual_result || '実測ログの記録なし (pending)'}
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-current/20 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>観測ステータス: <strong className={effectiveStatus === 'failed' ? 'text-rose-400' : 'text-emerald-400'}>{effectiveStatus.toUpperCase()}</strong></span>
                      <span>{liveRunResult ? `実行所要時間: ${liveRunResult.durationMs}ms` : '初期検証ログ'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Test Runner */}
              <InteractiveTestRunner node={node} onTestExecuted={res => setLiveRunResult(res)} />

              {/* Evidence */}
              {node.sections?.['Evidence'] && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">エビデンス・証跡 (Evidence)</div>
                  <div className="text-xs text-slate-300 mt-1 font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    {node.sections['Evidence']}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* General Sections View for Need, Requirement, Spec, Design */
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                ドキュメント詳細セクション
              </div>

              {node.sections && Object.keys(node.sections).length > 0 ? (
                Object.entries(node.sections).map(([title, content]) => (
                  <div key={title} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-2">
                      {title}
                    </h3>
                    <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {content}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 whitespace-pre-wrap font-mono">
                  {node.content}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full">
            <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-mono text-[11px] truncate">{node.filePath || node.id}</span>
            {node.filePath && (
              <button
                onClick={() => copyToClipboard(node.filePath!, 'ファイルパス', 'modal-path')}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition shrink-0"
                title="ファイルパスをコピー"
              >
                {copiedKey === 'modal-path' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const md = `# ${node.id}: ${node.title}\n\n${node.content}`;
                copyToClipboard(md, 'ノード内容(Markdown)');
              }}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition flex items-center gap-1.5"
            >
              <Copy className="w-3 h-3" />
              <span>Markdownコピー</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-semibold transition"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
