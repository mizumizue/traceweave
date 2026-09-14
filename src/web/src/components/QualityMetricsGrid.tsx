import React from 'react';
import { CircularGauge } from './CircularGauge.js';
import { ChevronRight } from 'lucide-react';
import { AppTab } from '../utils/urlState.js';
import { TraceWeaveReport } from '../../../core/models/types.js';

interface QualityMetricsGridProps {
  summary: TraceWeaveReport['summary'];
  highCriticalityCount: number;
  onNavigateTab: (tab: AppTab, message?: string) => void;
  onSelectRequirementClass?: (cls: 'functional' | 'non_functional') => void;
}

export function QualityMetricsGrid({
  summary,
  highCriticalityCount,
  onNavigateTab,
  onSelectRequirementClass,
}: QualityMetricsGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
      {/* Global Sufficiency Score with Circular Gauges (5 cols on lg) */}
      <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800/90 px-5 py-3.5 rounded-2xl shadow-sm flex items-center justify-around gap-4 hover:border-slate-700/80 transition-all">
        <div className="flex items-center gap-3.5">
          <CircularGauge
            value={summary.overallSufficiencyScore}
            size={50}
            strokeWidth={4.5}
            label="全体品質充足度"
          />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              全体品質充足度（実行合格）
            </div>
            <div className="text-xl font-black text-teal-400 leading-none mt-1">
              {summary.overallSufficiencyScore}%
            </div>
            <div className="mt-1">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  summary.overallSufficiencyScore >= 80
                    ? 'bg-teal-950/80 text-teal-300 border-teal-800/60'
                    : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                }`}
              >
                {summary.overallSufficiencyScore >= 80 ? '高充足' : '要改善'}
              </span>
            </div>
          </div>
        </div>

        <div className="h-10 w-px bg-slate-800" />

        <div className="flex items-center gap-3.5">
          <CircularGauge
            value={summary.highCriticalityCoverage}
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
                summary.highCriticalityCoverage >= 80 ? 'text-teal-400' : 'text-amber-400'
              }`}
            >
              {summary.highCriticalityCoverage}%
            </div>
            <div className="mt-1">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  summary.highCriticalityCoverage >= 80
                    ? 'bg-teal-950/80 text-teal-300 border-teal-800/60'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                }`}
              >
                {summary.highCriticalityCoverage >= 80 ? '完全カバー' : '欠落あり'}
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
            {summary.totalNeeds}
          </div>
          <div className="text-[10px] text-slate-500 truncate">最上位ビジネス要求</div>
        </div>

        <div
          onClick={() => onNavigateTab('matrix', 'マトリクスタブに切り替えました')}
          className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl hover:border-slate-700 hover:bg-slate-900/80 transition-all shadow-sm cursor-pointer group flex flex-col justify-between"
          title={`High重要度: ${highCriticalityCount}件`}
        >
          <div className="text-xs text-slate-400 flex items-center justify-between font-medium">
            <span className="truncate">要件 (REQ)</span>
            <span className="text-base shrink-0 ml-1">📋</span>
          </div>
          <div className="text-2xl font-black text-teal-300 my-1 font-mono group-hover:text-teal-200 transition">
            {summary.totalRequirements}
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onSelectRequirementClass?.('functional');
                }}
                className="hover:text-emerald-300 transition"
                title="機能要件のみ表示"
              >
                FR {summary.functionalRequirementCount}
              </button>
              <span className="text-slate-600">/</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onSelectRequirementClass?.('non_functional');
                }}
                className="hover:text-amber-300 transition"
                title="非機能要件のみ表示"
              >
                NFR {summary.nonFunctionalRequirementCount}
              </button>
            </span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-teal-400 transition" />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl hover:border-slate-700 hover:bg-slate-900/80 transition-all shadow-sm flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between font-medium">
            <span className="truncate">仕様 (SPEC)</span>
            <span className="text-base shrink-0 ml-1">⚙️</span>
          </div>
          <div className="text-2xl font-black text-cyan-300 my-1 font-mono">
            {summary.totalSpecifications}
          </div>
          <div className="text-[10px] text-slate-500 truncate">設計・実装仕様</div>
        </div>

        <div
          onClick={() => onNavigateTab('stratum', '工程地層ピラミッド診断タブに切り替えました')}
          className="bg-slate-900/50 border border-slate-800/80 p-3.5 rounded-2xl hover:border-slate-700 hover:bg-slate-900/80 transition-all shadow-sm cursor-pointer group flex flex-col justify-between"
        >
          <div className="text-xs text-slate-400 flex items-center justify-between font-medium">
            <span className="truncate">テスト (TEST)</span>
            <span className="text-base shrink-0 ml-1">🧪</span>
          </div>
          <div className="text-2xl font-black text-emerald-300 my-1 font-mono group-hover:text-emerald-200 transition">
            {summary.totalTestCases}
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>
              合格 {summary.passedTestCaseCount} / 未実行 {summary.pendingTestCaseCount}
            </span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-400 transition" />
          </div>
        </div>
      </div>
    </div>
  );
}
