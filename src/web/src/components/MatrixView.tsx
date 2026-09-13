import React, { useState } from 'react';
import {
  Search,
  Filter,
  PieChart as PieChartIcon,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  X,
} from 'lucide-react';
import { MatrixRow } from '../../../core/models/types.js';
import { CircularGauge } from './CircularGauge.js';
import { RequirementClassBadge } from './RequirementClassBadge.js';
import { toast } from 'sonner';

interface MatrixViewProps {
  rows: MatrixRow[];
  totalMatrixCount: number;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  criticalityFilter: string;
  onCriticalityFilterChange: (criticality: string) => void;
  requirementClassFilter: string;
  onRequirementClassFilterChange: (requirementClass: string) => void;
  phaseFilter: string;
  onPhaseFilterChange: (phase: string) => void;
  scoreFilter: string;
  onScoreFilterChange: (score: string) => void;
  onResetFilters: () => void;
  isFilterActive: boolean;
  onSelectNode: (id: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function MatrixView({
  rows,
  totalMatrixCount,
  searchQuery,
  onSearchQueryChange,
  criticalityFilter,
  onCriticalityFilterChange,
  requirementClassFilter,
  onRequirementClassFilterChange,
  phaseFilter,
  onPhaseFilterChange,
  scoreFilter,
  onScoreFilterChange,
  onResetFilters,
  isFilterActive,
  onSelectNode,
  searchInputRef,
}: MatrixViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1800);
    toast.success(`${label}をコピーしました: ${text}`);
  };

  return (
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
              onChange={e => onSearchQueryChange(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchQueryChange('')}
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
              <span className="text-slate-400 text-[11px]">区分:</span>
              <select
                value={requirementClassFilter}
                onChange={e => onRequirementClassFilterChange(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="all" className="bg-slate-900">すべて</option>
                <option value="functional" className="bg-slate-900">機能要件 (FR)</option>
                <option value="non_functional" className="bg-slate-900">非機能要件 (NFR)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <span className="text-slate-400 text-[11px]">重要度:</span>
              <select
                value={criticalityFilter}
                onChange={e => onCriticalityFilterChange(e.target.value)}
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
                onChange={e => onPhaseFilterChange(e.target.value)}
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
                onChange={e => onScoreFilterChange(e.target.value)}
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
                onClick={onResetFilters}
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
                onRequirementClassFilterChange('functional');
                toast.info('機能要件 (FR) で絞り込みました');
              }}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                requirementClassFilter === 'functional'
                  ? 'bg-emerald-950 text-emerald-200 border-emerald-600 font-bold'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              FR 機能要件
            </button>
            <button
              onClick={() => {
                onRequirementClassFilterChange('non_functional');
                toast.info('非機能要件 (NFR) で絞り込みました');
              }}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                requirementClassFilter === 'non_functional'
                  ? 'bg-amber-950 text-amber-200 border-amber-600 font-bold'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              NFR 非機能要件
            </button>
            <button
              onClick={() => {
                onCriticalityFilterChange('high');
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
                onScoreFilterChange('unsatisfied');
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
                onPhaseFilterChange('unit');
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
            表示中: <strong className="text-teal-400 font-bold">{rows.length}</strong> / {totalMatrixCount} 要件
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      {rows.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Search className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-base font-bold text-slate-300">一致する要件が見つかりませんでした</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            検索条件またはフィルターを変更するか、以下のボタンからフィルターをリセットしてください。
          </p>
          <button
            onClick={onResetFilters}
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
                  <th className="py-3.5 px-4 pl-5 whitespace-nowrap w-[34%]">要求 / 要件</th>
                  <th className="py-3.5 px-4 whitespace-nowrap w-[9%]">区分</th>
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
                {rows.map(row => (
                  <tr
                    key={row.requirementId}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Need / Requirement */}
                    <td className="p-4 pl-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectNode(row.requirementId)}
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
                            onClick={() => onSelectNode(row.needId!)}
                            className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700/70 transition shrink-0"
                            title={`${row.needId}: ${row.needTitle}`}
                          >
                            {row.needId}
                          </button>
                        )}
                      </div>
                      <div
                        onClick={() => onSelectNode(row.requirementId)}
                        className="text-xs text-slate-400 mt-1 line-clamp-2 cursor-pointer hover:text-slate-200 transition leading-relaxed [line-break:strict]"
                      >
                        {row.requirementTitle}
                      </div>
                    </td>

                    {/* Requirement class */}
                    <td className="p-4 whitespace-nowrap">
                      <RequirementClassBadge value={row.requirementClass} showLabel size="md" />
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
                              onClick={() => onSelectNode(spec.id)}
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
                                onClick={() => onSelectNode(tc.id)}
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
  );
}
