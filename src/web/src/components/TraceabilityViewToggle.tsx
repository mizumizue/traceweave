import React from 'react';
import { TableProperties, Network } from 'lucide-react';
import { TraceabilityView } from '../utils/urlState.js';

interface TraceabilityViewToggleProps {
  activeView: TraceabilityView;
  onSelectView: (view: TraceabilityView) => void;
  matrixCount: number;
  graphNodeCount: number;
}

export function TraceabilityViewToggle({
  activeView,
  onSelectView,
  matrixCount,
  graphNodeCount,
}: TraceabilityViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-900/60 border border-slate-800/80 rounded-xl w-fit">
      <button
        type="button"
        onClick={() => onSelectView('matrix')}
        title="トレーサビリティマトリクス"
        className={`px-3 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 rounded-lg transition-all whitespace-nowrap ${
          activeView === 'matrix'
            ? 'bg-teal-950/80 text-teal-300 border border-teal-800/60 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
        }`}
      >
        <TableProperties className="w-4 h-4 shrink-0" />
        <span>マトリクス</span>
        <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-slate-300 shrink-0 leading-none">
          {matrixCount}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelectView('graph')}
        title="トレーサビリティグラフ"
        className={`px-3 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 rounded-lg transition-all whitespace-nowrap ${
          activeView === 'graph'
            ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
        }`}
      >
        <Network className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>グラフ</span>
        <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-950/80 border border-indigo-800/60 rounded-full text-indigo-300 font-bold shrink-0 leading-none">
          {graphNodeCount}
        </span>
      </button>
    </div>
  );
}
