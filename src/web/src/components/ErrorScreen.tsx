import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorScreenProps {
  error: string | null;
  onRetry: () => void;
}

export function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
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
          onClick={onRetry}
          className="mt-5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 mx-auto transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 再試行する
        </button>
      </div>
    </div>
  );
}
