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
  onNavigateHome?: () => void;
}

export function Header({
  isRefreshing,
  onRefresh,
  onCopySummaryMarkdown,
  onCopyShareUrl,
  onExportCsv,
  onExportJson,
  onNavigateHome,
}: HeaderProps) {
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If user holds modifier keys or uses non-left click, let browser handle native navigation
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    if (onNavigateHome) {
      e.preventDefault();
      onNavigateHome();
    }
  };

  const rootHref = typeof window !== 'undefined' && window.location ? window.location.pathname || '/' : '/';

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
      {/* Brand Identity & Subtitle */}
      <div className="flex flex-col justify-center gap-1.5 min-w-0">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <a
            href={rootHref}
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 shrink-0 group cursor-pointer select-none rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 pr-1.5 transition-colors"
            title="TraceWeave トップ（ルート画面）へ戻る"
            aria-label="TraceWeave ホームへ戻る"
          >
            <span className="text-2xl sm:text-3xl filter drop-shadow select-none shrink-0 group-hover:scale-105 transition-transform duration-200">
              🕸️
            </span>
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent shrink-0 group-hover:opacity-90 transition-opacity">
              TraceWeave
            </h1>
          </a>
          <span className="text-[11px] font-mono px-2.5 py-0.5 bg-teal-950/80 text-teal-300 border border-teal-700/60 rounded-full font-semibold shadow-sm shrink-0 whitespace-nowrap tracking-wide">
            v0.1.0 Live Matrix
          </span>
        </div>
        <p className="text-xs text-slate-400 font-normal leading-relaxed max-w-2xl">
          要求からテストまでの一貫した縦糸 × 工程・手法の横糸で織りなすV字モデル品質トレーサビリティ
        </p>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shrink-0 shadow-sm self-start sm:self-auto overflow-x-auto max-w-full">
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
