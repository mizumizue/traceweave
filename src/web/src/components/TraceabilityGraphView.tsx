import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  DocNode,
  DocKind,
  TraceabilityGraphData,
  TraceGraphVisualNode,
  TraceGraphVisualEdge,
} from '../../../core/models/types.js';
import { TraceabilityGraphBuilder, GRAPH_RANKS } from '../../../core/graph/TraceabilityGraphBuilder.js';
import { KIND_META } from './DecisionsBrowser.js';
import { RequirementClassBadge } from './RequirementClassBadge.js';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Info,
  SlidersHorizontal,
  X,
  Compass,
  Sparkles,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Move,
  Expand,
  Shrink,
  Columns,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface TraceabilityGraphViewProps {
  nodes: DocNode[];
  onSelectNode: (id: string) => void;
  initialSelectedId?: string | null;
  highlightMode?: 'all' | 'upstream' | 'downstream';
  onHighlightModeChange?: (mode: 'all' | 'upstream' | 'downstream') => void;
}

export function TraceabilityGraphView({
  nodes,
  onSelectNode,
  initialSelectedId = null,
  highlightMode: highlightModeProp,
  onHighlightModeChange,
}: TraceabilityGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen view mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Viewport pan & zoom state
  const [zoom, setZoom] = useState<number>(0.92);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 20 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  // Filtering & Interaction state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hiddenKinds, setHiddenKinds] = useState<Set<DocKind>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSelectedId);
  const [internalHighlightMode, setInternalHighlightMode] = useState<'all' | 'upstream' | 'downstream'>(
    highlightModeProp ?? 'all'
  );
  const highlightMode = highlightModeProp !== undefined ? highlightModeProp : internalHighlightMode;

  const handleHighlightModeChange = (mode: 'all' | 'upstream' | 'downstream') => {
    setInternalHighlightMode(mode);
    onHighlightModeChange?.(mode);
  };
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Sync initialSelectedId when prop changes
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedNodeId(initialSelectedId);
    }
  }, [initialSelectedId]);

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        toast.info('全画面表示を終了しました');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Toggle kind visibility (原則All表示、クリックでその種別のみ非表示/再表示)
  const handleToggleKind = (kind: DocKind) => {
    setHiddenKinds(prev => {
      const next = new Set(prev);
      const meta = KIND_META[kind];
      const kindLabel = meta?.short || kind;
      if (next.has(kind)) {
        next.delete(kind);
        toast.info(`種別「${kindLabel}」を再表示しました`);
      } else {
        next.add(kind);
        toast.info(`種別「${kindLabel}」を非表示にしました`);
      }
      return next;
    });
  };

  // Reset all kind filters (All表示に戻す)
  const handleResetKindFilter = () => {
    if (hiddenKinds.size > 0) {
      setHiddenKinds(new Set());
      toast.info('すべての種別のノードを再表示しました');
    }
  };

  // Build visual graph layout dynamically
  const graphData: TraceabilityGraphData = useMemo(() => {
    return TraceabilityGraphBuilder.buildGraph(nodes, {
      excludedKinds: hiddenKinds,
      searchQuery,
      selectedNodeId: selectedNodeId || hoveredNodeId,
      highlightMode,
      nodeWidth: 240,
      nodeHeight: 84,
      xGap: 96,
      yGap: 24,
    });
  }, [nodes, hiddenKinds, searchQuery, selectedNodeId, hoveredNodeId, highlightMode]);

  // Node fast lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, TraceGraphVisualNode>();
    for (const n of graphData.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [graphData.nodes]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(Number((prev + 0.15).toFixed(2)), 2.5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.25));
  };

  const handleResetZoom = () => {
    setZoom(0.92);
    setPan({ x: 30, y: 20 });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    toast.info('表示位置とズームを初期化しました');
  };

  // Fit to screen (both width and height)
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const graphWidth = graphData.bounds.width;
    const graphHeight = graphData.bounds.height;

    const scaleX = (clientWidth - 60) / graphWidth;
    const scaleY = (clientHeight - 80) / graphHeight;
    const newZoom = Math.max(0.25, Math.min(scaleX, scaleY, 1.1));

    const newPanX = Math.max(20, (clientWidth - graphWidth * newZoom) / 2);
    const newPanY = Math.max(20, (clientHeight - graphHeight * newZoom) / 2);

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: newPanX, y: newPanY });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    toast.info('グラフを画面サイズにフィットさせました');
  }, [graphData.bounds]);

  // Fit width (fit all columns horizontally while allowing vertical downward scroll)
  const handleFitWidth = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth } = containerRef.current;
    if (clientWidth === 0) return;

    const graphWidth = graphData.bounds.width;
    const scaleX = (clientWidth - 80) / graphWidth;
    const newZoom = Math.max(0.35, Math.min(scaleX, 1.2));

    setZoom(Number(newZoom.toFixed(2)));
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    toast.info('全列を画面幅に合わせて最適化しました（下スクロール可能）');
  }, [graphData.bounds]);

  // Pan handlers using container scrollLeft / scrollTop
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan on left mouse button and not on cards/buttons/inputs
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }

    if (!containerRef.current) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    containerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel handling:
  // - Ctrl/Cmd + wheel: zoom in/out
  // - Normal wheel: native vertical scroll downwards/upwards!
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom(prev => Math.min(Math.max(Number((prev * zoomFactor).toFixed(2)), 0.25), 2.5));
    }
  };

  // Node selection
  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      toast.info('選択を解除しました');
    } else {
      setSelectedNodeId(id);
      toast.success(`${id} を選択しました（影響パス強調中）`);
    }
  };

  const handleOpenDetail = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelectNode(id);
  };

  // Edge path generator: cubic bezier
  const generateBezierPath = (edge: TraceGraphVisualEdge): string => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return '';

    const x1 = sourceNode.x + sourceNode.width;
    const y1 = sourceNode.y + sourceNode.height / 2;
    const x2 = targetNode.x;
    const y2 = targetNode.y + targetNode.height / 2;

    const dx = Math.abs(x2 - x1);
    const curvature = Math.max(40, dx * 0.45);

    const cx1 = x1 + curvature;
    const cy1 = y1;
    const cx2 = x2 - curvature;
    const cy2 = y2;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  // Calculate total canvas dimensions according to zoom and graph bounds
  const contentWidth = useMemo(() => {
    return Math.max(1200, Math.round(graphData.bounds.width * zoom) + 120);
  }, [graphData.bounds.width, zoom]);

  const contentHeight = useMemo(() => {
    return Math.max(700, Math.round(graphData.bounds.height * zoom) + 140);
  }, [graphData.bounds.height, zoom]);

  return (
    <div
      className={`flex flex-col bg-slate-950 border border-slate-800/80 shadow-2xl relative select-none transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none'
          : 'h-[calc(100vh-11rem)] min-h-[680px] rounded-2xl overflow-hidden'
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/60 border border-indigo-800/60 rounded-xl text-indigo-300 font-semibold text-sm whitespace-nowrap shrink-0">
            <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>トレーサビリティグラフ</span>
          </div>

          {/* Search box */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ノードID / タイトルで検索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-800/90 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Kind Filter Pills: 原則All表示、クリックでその種別のみ非表示（除外トグル） */}
          <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0">
            <button
              onClick={handleResetKindFilter}
              title={hiddenKinds.size === 0 ? '全種別のノードを表示中' : 'クリックして全種別のノードを再表示（リセット）'}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap shrink-0 transition-all ${
                hiddenKinds.size === 0
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] opacity-80">
                ({graphData.stats.visibleNodes}/{graphData.stats.totalNodes})
              </span>
            </button>
            {(Object.keys(KIND_META) as DocKind[]).map(kind => {
              const meta = KIND_META[kind];
              const isHidden = hiddenKinds.has(kind);
              const count = nodes.filter(n => n.kind === kind).length;
              if (count === 0) return null;
              return (
                <button
                  key={kind}
                  onClick={() => handleToggleKind(kind)}
                  title={
                    isHidden
                      ? `「${meta.label}」は現在非表示です。クリックして再表示`
                      : `「${meta.label}」を表示中。クリックして非表示にする`
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium border whitespace-nowrap shrink-0 transition-all ${
                    isHidden
                      ? 'bg-slate-900/60 text-slate-500 border-slate-800 line-through opacity-50 hover:opacity-80 hover:border-slate-700'
                      : `${meta.badgeBg} border-slate-700/80 shadow-sm hover:border-indigo-400 hover:brightness-110`
                  }`}
                >
                  {isHidden ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : meta.icon}
                  <span>{meta.short}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right controls: Highlight mode, Zoom buttons, Fullscreen toggle */}
        <div className="flex items-center gap-2">
          {/* Highlight mode */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/80 text-xs">
            <button
              onClick={() => handleHighlightModeChange('all')}
              title="選択ノードの上流・下流すべての影響パスを強調"
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                highlightMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全トレース
            </button>
            <button
              onClick={() => handleHighlightModeChange('upstream')}
              title="選択ノードの上流（依存先・前提）のみを強調"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors ${
                highlightMode === 'upstream' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>上流</span>
            </button>
            <button
              onClick={() => handleHighlightModeChange('downstream')}
              title="選択ノードの下流（影響を受ける設計・テスト）のみを強調"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors ${
                highlightMode === 'downstream' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3 h-3" />
              <span>下流</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700/80 mx-1 hidden sm:block" />

          {/* Zoom & Viewport controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700/80">
            <button
              onClick={handleZoomOut}
              title="縮小 (Zoom Out)"
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-lg transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 w-11 text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="拡大 (Zoom In)"
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-lg transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitWidth}
              title="全列を画面幅に収容（Fit Width: 下スクロールで閲覧）"
              className="p-1 text-slate-300 hover:text-indigo-400 hover:bg-slate-700/70 rounded-lg transition-colors ml-0.5"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitToScreen}
              title="画面に全体収容 (Fit to Screen)"
              className="p-1 text-slate-300 hover:text-indigo-400 hover:bg-slate-700/70 rounded-lg transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="初期位置に戻す (Reset View)"
              className="p-1 text-slate-300 hover:text-indigo-400 hover:bg-slate-700/70 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700/80 mx-1 hidden sm:block" />

          {/* Fullscreen Toggle Button */}
          <button
            onClick={() => {
              setIsFullscreen(prev => !prev);
              toast.info(isFullscreen ? '全画面表示を終了しました' : '全画面（フルウィンドウ）表示に切り替えました (Escで終了)');
            }}
            title={isFullscreen ? '通常表示に戻す (Esc)' : '画面いっぱいに全画面表示'}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-200 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            {isFullscreen ? (
              <>
                <Shrink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">通常表示</span>
              </>
            ) : (
              <>
                <Expand className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">全画面</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Selected Node Banner Ribbon */}
      {selectedNode && (
        <div className="sticky top-0 z-25 flex items-center justify-between gap-4 px-5 py-2.5 bg-slate-900/95 border-b border-indigo-500/70 shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-2 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 shrink-0">
              {KIND_META[selectedNode.kind]?.icon || <Layers className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-300">{selectedNode.id}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedNode.rankName}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  (上流: {selectedNode.upstreamCount} 件 / 下流: {selectedNode.downstreamCount} 件)
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium truncate">{selectedNode.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick jump to direct upstream */}
            {selectedNode.upstreamIds.length > 0 && (
              <div className="hidden md:flex items-center gap-1">
                <span className="text-[10px] text-slate-400">上流:</span>
                {selectedNode.upstreamIds.slice(0, 3).map(uid => (
                  <button
                    key={uid}
                    onClick={() => setSelectedNodeId(uid)}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-indigo-900/60 hover:text-indigo-200 text-slate-300 rounded border border-slate-700"
                  >
                    {uid}
                  </button>
                ))}
              </div>
            )}

            {/* Quick jump to direct downstream */}
            {selectedNode.downstreamIds.length > 0 && (
              <div className="hidden md:flex items-center gap-1 ml-2">
                <span className="text-[10px] text-slate-400">下流:</span>
                {selectedNode.downstreamIds.slice(0, 3).map(did => (
                  <button
                    key={did}
                    onClick={() => setSelectedNodeId(did)}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 hover:bg-indigo-900/60 hover:text-indigo-200 text-slate-300 rounded border border-slate-700"
                  >
                    {did}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={e => handleOpenDetail(e, selectedNode.id)}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <span>詳細を開く</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title="選択解除"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Scrollable Canvas Area (Allows Downward Scroll and Pan Dragging) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 w-full h-full overflow-auto relative ${
          isPanning ? 'cursor-grabbing' : 'cursor-default'
        }`}
      >
        <div style={{ width: `${contentWidth}px`, minHeight: `${contentHeight}px`, position: 'relative' }}>
          {/* Sticky Rank Columns Header Bar */}
          <div
            className="sticky top-0 z-20 py-2.5 px-3 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 pointer-events-none"
            style={{ width: `${contentWidth}px` }}
          >
            <div className="relative" style={{ height: '38px' }}>
              {graphData.ranks.map(r => (
                <div
                  key={r.rank}
                  className="absolute top-0 flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-md text-xs pointer-events-auto"
                  style={{
                    left: `${r.x * zoom}px`,
                    width: `${240 * zoom}px`,
                  }}
                >
                  <span className="font-semibold text-slate-200 truncate" title={r.name}>{r.name}</span>
                  <span className="font-mono text-[11px] text-indigo-300 font-bold bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-800/60 shrink-0 ml-1">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <svg
            width={contentWidth}
            height={contentHeight}
            className="select-none block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Arrow marker for normal edges */}
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#64748b" />
              </marker>

              {/* Arrow marker for highlighted edges */}
              <marker
                id="arrow-highlighted"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#818cf8" />
              </marker>

              {/* Glowing filter for highlighted paths */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Subtle grid pattern */}
              <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.4" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#graph-grid)" />

            {/* Transform group for Zoom */}
            <g transform={`scale(${zoom})`} style={{ transformOrigin: '0 0' }}>
              {/* Rank Column Guidelines */}
              {graphData.ranks.map(r => (
                <g key={r.rank}>
                  {/* Column background strip */}
                  <rect
                    x={r.x - 12}
                    y={10}
                    width={264}
                    height={graphData.bounds.height}
                    fill="#0f172a"
                    fillOpacity="0.4"
                    rx="12"
                  />
                </g>
              ))}

              {/* Edge Lines Layer */}
              <g className="edges-layer">
                {graphData.edges.map(edge => {
                  const pathD = generateBezierPath(edge);
                  if (!pathD) return null;

                  const isHi = edge.isHighlighted;
                  const isDim = edge.isDimmed;

                  return (
                    <path
                      key={edge.id}
                      d={pathD}
                      fill="none"
                      stroke={isHi ? '#818cf8' : '#475569'}
                      strokeWidth={isHi ? 2.5 : 1.5}
                      strokeOpacity={isDim ? 0.12 : isHi ? 0.95 : 0.5}
                      strokeDasharray={edge.type === 'link' ? '4 4' : undefined}
                      markerEnd={isHi ? 'url(#arrow-highlighted)' : 'url(#arrow-default)'}
                      filter={isHi ? 'url(#glow)' : undefined}
                      className="transition-all duration-300 pointer-events-none"
                    />
                  );
                })}
              </g>

              {/* Nodes Layer */}
              <g className="nodes-layer">
                {graphData.nodes.map(node => {
                  const isSelected = selectedNodeId === node.id;
                  const isHi = node.isHighlighted;
                  const isDim = node.isDimmed;
                  const meta = KIND_META[node.kind];

                  return (
                    <foreignObject
                      key={node.id}
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      className={`transition-all duration-300 ${
                        isDim ? 'opacity-25 hover:opacity-80' : 'opacity-100'
                      }`}
                    >
                      <div
                        onClick={e => handleNodeClick(e, node.id)}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className={`w-full h-full p-2.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-900 border-indigo-400 ring-2 ring-indigo-500/80 shadow-2xl scale-[1.02]'
                            : isHi
                            ? 'bg-slate-900/95 border-indigo-500/90 shadow-lg'
                            : 'bg-slate-900/85 border-slate-800 hover:border-slate-600 hover:bg-slate-900 shadow-md'
                        }`}
                      >
                        {/* Top row: Kind badge & status/criticality */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                                meta?.badgeBg || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {meta?.short || node.kind}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-200">
                              {node.id}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {node.requirement_class && (
                              <RequirementClassBadge value={node.requirement_class} />
                            )}
                            {node.criticality && (
                              <span
                                className={`text-[9px] font-semibold px-1 py-0.2 rounded uppercase ${
                                  node.criticality === 'high'
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                    : node.criticality === 'medium'
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {node.criticality}
                              </span>
                            )}
                            {node.test_level && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                                {node.test_level.replace('integration_', 'IT-')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle row: Title */}
                        <p
                          title={node.title}
                          className="text-[11px] font-medium text-slate-300 truncate leading-tight my-1"
                        >
                          {node.title}
                        </p>

                        {/* Bottom row: Connections & open detail */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1">
                          <div className="flex items-center gap-2">
                            <span title={`上流依存: ${node.upstreamCount} 件`}>
                              ↑{node.upstreamCount}
                            </span>
                            <span title={`下流影響: ${node.downstreamCount} 件`}>
                              ↓{node.downstreamCount}
                            </span>
                          </div>

                          <button
                            onClick={e => handleOpenDetail(e, node.id)}
                            title="ドキュメント詳細インスペクターを開く"
                            className="flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-200 hover:underline"
                          >
                            <span>詳細</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </foreignObject>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>

        {/* Empty state when search or filter matches nothing */}
        {graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-950/80 backdrop-blur pointer-events-none">
            <Filter className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">
              条件に一致するノードが見つかりませんでした
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              検索キーワードまたは種別フィルターをリセットして再試行してください。
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setHiddenKinds(new Set());
              }}
              className="mt-4 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow pointer-events-auto"
            >
              フィルターをリセット
            </button>
          </div>
        )}
      </div>

      {/* 4. Bottom status bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900/90 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>
              表示ノード: <strong className="text-slate-200">{graphData.stats.visibleNodes}</strong> / {graphData.stats.totalNodes} 件
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>
              トレーサビリティエッジ: <strong className="text-slate-200">{graphData.stats.visibleEdges}</strong> 本
            </span>
          </div>
          {hiddenKinds.size > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <EyeOff className="w-3.5 h-3.5" />
              <span>{hiddenKinds.size} 種別を非表示中</span>
            </div>
          )}
          {selectedNodeId && (
            <div className="flex items-center gap-1 text-indigo-300 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>選択中: {selectedNodeId}</span>
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
          <span>※ 種別ボタンをクリックで表示/非表示を切り替え</span>
          <span>ノードをクリックで影響パス強調</span>
          <span>ホイールで上下スクロール（Ctrl+ホイールでズーム）</span>
          <span>ドラッグでパン移動</span>
          {isFullscreen && <span className="text-indigo-400 font-mono">[Esc] で通常表示</span>}
        </div>
      </div>
    </div>
  );
}
