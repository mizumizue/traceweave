import React from 'react';
import {
  RefreshCw,
  Copy,
  Link as LinkIcon,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';

interface HeaderProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  onCopySummaryMarkdown: () => void;
  onCopyShareUrl: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

export function Header({
  isRefreshing,
  onRefresh,
  onCopySummaryMarkdown,
  onCopyShareUrl,
  onExportCsv,
  onExportJson,
}: HeaderProps) {
  return (
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
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
          title="データを再読み込み"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
          <span className="hidden sm:inline">更新</span>
        </button>

        <button
          onClick={onCopySummaryMarkdown}
          className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
          title="Markdownサマリーをクリップボードにコピー"
        >
          <Copy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">要約コピー</span>
        </button>

        <button
          onClick={onCopyShareUrl}
          className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-teal-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
          title="現在の画面状態・フィルタを含むURLをクリップボードにコピー"
        >
          <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">URL共有</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        <button
          onClick={onExportCsv}
          className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
          title="マトリクスをCSV形式でダウンロード"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">CSV</span>
        </button>

        <button
          onClick={onExportJson}
          className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
          title="完全なレポートをJSON形式でダウンロード"
        >
          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">JSON</span>
        </button>
      </div>
    </header>
  );
}
