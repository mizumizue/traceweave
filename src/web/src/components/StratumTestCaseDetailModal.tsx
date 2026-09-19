import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  TestCasePattern,
  TestStratumCaseEntry,
} from '../../../core/models/types.js';

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 px-4 py-2 bg-slate-900/80 border-b border-slate-800">
        {title}
      </h3>
      <div className="px-4 py-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
        {children}
      </div>
    </section>
  );
}

function PatternCard({ pattern }: { pattern: TestCasePattern }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-teal-300">{pattern.id}</span>
        <span className="text-xs font-semibold text-slate-200">{pattern.name}</span>
        {pattern.status && (
          <span className="text-[10px] text-slate-500">({pattern.status})</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] font-bold text-slate-500 mb-1">入力</div>
          <pre className="text-[11px] text-slate-300 bg-slate-950 rounded-lg p-2 overflow-x-auto border border-slate-800">
            {JSON.stringify(pattern.inputs, null, 2)}
          </pre>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 mb-1">期待値</div>
          <pre className="text-[11px] text-slate-300 bg-slate-950 rounded-lg p-2 overflow-x-auto border border-slate-800">
            {JSON.stringify(pattern.expected, null, 2)}
          </pre>
        </div>
      </div>
      {(pattern.actual !== undefined || pattern.error) && (
        <div>
          <div className="text-[10px] font-bold text-slate-500 mb-1">実測</div>
          <pre className="text-[11px] text-slate-300 bg-slate-950 rounded-lg p-2 overflow-x-auto border border-slate-800">
            {pattern.error ?? JSON.stringify(pattern.actual, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

interface StratumTestCaseDetailModalProps {
  entry: TestStratumCaseEntry;
  onClose: () => void;
  onSelectNode: (id: string) => void;
}

export function StratumTestCaseDetailModal({
  entry,
  onClose,
  onSelectNode,
}: StratumTestCaseDetailModalProps) {
  const { sections, execution, parameters } = entry;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const resultText =
    execution.actualResult?.trim() || execution.errorMessage?.trim() || undefined;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl my-4 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="stratum-tc-detail-title"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-teal-300">{entry.id}</p>
            <h2 id="stratum-tc-detail-title" className="text-base font-bold text-slate-100 mt-1">
              {entry.title}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {entry.verifies.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSelectNode(v)}
                  className="font-mono text-[10px] text-emerald-400 border border-emerald-900/50 rounded px-1.5 py-0.5"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5 space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {sections.objective && (
            <DetailSection title="目的">{sections.objective}</DetailSection>
          )}
          <DetailSection title="前提">
            {sections.preconditions?.trim() || '（記載なし）'}
          </DetailSection>
          <DetailSection title="手順">{sections.steps?.trim() || '（記載なし）'}</DetailSection>
          <DetailSection title="期待値">
            {sections.expectedResults?.trim() || '（記載なし）'}
          </DetailSection>

          {(parameters?.patterns?.length || entry.parameterFile) && (
            <DetailSection title="テストデータ">
              {entry.parameterFile && (
                <p className="text-xs text-slate-400 mb-3 font-mono">{entry.parameterFile}</p>
              )}
              {parameters?.description && (
                <p className="text-xs text-slate-400 mb-3">{parameters.description}</p>
              )}
              {parameters?.patterns?.length ? (
                <div className="space-y-3">
                  {parameters.patterns.map(p => (
                    <PatternCard key={p.id} pattern={p} />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs italic">
                  パラメータ JSON はレポート生成時に読み込めませんでした。ドキュメントの parameter_file
                  を確認してください。
                </p>
              )}
            </DetailSection>
          )}

          <DetailSection title="実施結果">
            <p className="text-xs text-slate-400 mb-2">
              合否:{' '}
              <span className="font-bold text-slate-200">
                {execution.status === 'passed'
                  ? '合格'
                  : execution.status === 'failed'
                    ? '不合格'
                    : execution.status === 'skipped'
                      ? 'スキップ'
                      : '未実行'}
              </span>
              {execution.durationMs !== undefined && (
                <span className="ml-2 font-mono">({execution.durationMs} ms)</span>
              )}
            </p>
            {resultText ? resultText : '（実行ログなし）'}
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
