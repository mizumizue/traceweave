import React from 'react';

export function Footer() {
  return (
    <footer className="mt-12 py-5 border-t border-slate-900 text-center text-xs text-slate-500 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>TraceWeave — V-Model Traceability Matrix & Test Stratum Analyzer</span>
        <span className="text-[11px] font-mono">ショートカット: [ / ] 検索フォーカス | [ Esc ] モーダルを閉じる</span>
      </div>
    </footer>
  );
}
