import React from 'react';
import {
  TableProperties,
  Network,
  Layers,
  Code2,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { AppTab } from '../utils/urlState.js';

interface TabNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  matrixCount: number;
  graphNodeCount: number;
  unitCoveragePercent: number;
  decisionsCount: number;
  totalGapsCount: number;
}

export function TabNav({
  activeTab,
  onSelectTab,
  matrixCount,
  graphNodeCount,
  unitCoveragePercent,
  decisionsCount,
  totalGapsCount,
}: TabNavProps) {
  return (
    <nav className="flex items-center space-x-2 sm:space-x-3 border-b border-slate-800/80 pb-px overflow-x-auto no-scrollbar scroll-smooth">
      <button
        onClick={() => onSelectTab('matrix')}
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
          {matrixCount}
        </span>
      </button>

      <button
        onClick={() => onSelectTab('graph')}
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
          {graphNodeCount}
        </span>
      </button>

      <button
        onClick={() => onSelectTab('stratum')}
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
        onClick={() => onSelectTab('unit')}
        title="単体テスト実装カバレッジ (関数・分岐)"
        className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all rounded-t-lg whitespace-nowrap shrink-0 ${
          activeTab === 'unit'
            ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 shadow-sm'
            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
        }`}
      >
        <Code2 className="w-4 h-4 shrink-0" />
        <span>単体カバレッジ</span>
        <span className="ml-1 text-[11px] font-mono px-2 py-0.5 bg-cyan-950/80 border border-cyan-800/60 rounded-full text-cyan-300 shrink-0 leading-none">
          {unitCoveragePercent}%
        </span>
      </button>

      <button
        onClick={() => onSelectTab('decisions')}
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
          {decisionsCount}
        </span>
      </button>

      <button
        onClick={() => onSelectTab('gaps')}
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
  );
}
