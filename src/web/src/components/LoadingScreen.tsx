import React from 'react';

export function LoadingScreen() {
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
