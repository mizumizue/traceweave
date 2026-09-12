import React from 'react';
import { AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { DocNode, TraceWeaveReport } from '../../../core/models/types.js';
import { toast } from 'sonner';

interface GapsViewProps {
  gaps: TraceWeaveReport['gaps'];
  nodeMap: Map<string, DocNode>;
  onSelectNode: (id: string) => void;
  onFilterInMatrix: (reqId: string) => void;
}

export function GapsView({
  gaps,
  nodeMap,
  onSelectNode,
  onFilterInMatrix,
}: GapsViewProps) {
  const totalGapsCount = gaps.untestedRequirements.length + gaps.missingIntegrationRequirements.length;

  const handleCopyTasks = () => {
    const tasks = [
      `# TraceWeave 残課題タスクリスト`,
      ...gaps.untestedRequirements.map(id => `- [ ] ${id}: 単体/総合テストケースの作成`),
      ...gaps.missingIntegrationRequirements.map(id => `- [ ] ${id}: 結合テスト (ITa/ITb) の作成`),
    ].join('\n');
    navigator.clipboard.writeText(tasks);
    toast.success('未対応タスクリストをコピーしました');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Risk Overview Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                品質ギャップ & 検出リスク一覧
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                V字モデルにおける未検証要件や結合テスト不足を検出し、リリース前に対処すべき課題を提示します。
              </p>
            </div>
          </div>

          {totalGapsCount > 0 && (
            <button
              onClick={handleCopyTasks}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
            >
              <Copy className="w-3.5 h-3.5 text-teal-400" />
              <span>課題リストをコピー</span>
            </button>
          )}
        </div>

        {/* Two Column Risk Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* 1. Untested Requirements */}
          <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-rose-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>未テスト要件 (Untested Requirements)</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 bg-rose-950 text-rose-300 rounded-full border border-rose-800/80">
                {gaps.untestedRequirements.length} 件
              </span>
            </div>

            {gaps.untestedRequirements.length > 0 ? (
              <ul className="space-y-2.5 text-xs text-slate-300">
                {gaps.untestedRequirements.map(reqId => {
                  const node = nodeMap.get(reqId);
                  return (
                    <li
                      key={reqId}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectNode(reqId)}
                            className="font-bold font-mono text-rose-300 hover:underline"
                          >
                            {reqId}
                          </button>
                          {node?.criticality && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-rose-950 text-rose-400 rounded border border-rose-900">
                              {node.criticality}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {node?.title || '要件定義'}
                        </div>
                      </div>

                      <button
                        onClick={() => onFilterInMatrix(reqId)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded text-[11px] font-semibold transition shrink-0"
                      >
                        マトリクスで確認
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs text-teal-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>全ての要件に1件以上のテストケースが紐づいています。</span>
              </div>
            )}
          </div>

          {/* 2. Missing Integration Tests */}
          <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>結合テスト未実施要件 (Missing Integration Tests)</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 bg-amber-950 text-amber-300 rounded-full border border-amber-800/80">
                {gaps.missingIntegrationRequirements.length} 件
              </span>
            </div>

            {gaps.missingIntegrationRequirements.length > 0 ? (
              <ul className="space-y-2.5 text-xs text-slate-300 max-h-72 overflow-y-auto pr-1">
                {gaps.missingIntegrationRequirements.map(reqId => {
                  const node = nodeMap.get(reqId);
                  return (
                    <li
                      key={reqId}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectNode(reqId)}
                            className="font-bold font-mono text-amber-300 hover:underline"
                          >
                            {reqId}
                          </button>
                          {node?.criticality && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 bg-amber-950 text-amber-400 rounded border border-amber-900">
                              {node.criticality}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {node?.title || '要件定義'}
                        </div>
                      </div>

                      <button
                        onClick={() => onFilterInMatrix(reqId)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-semibold transition shrink-0"
                      >
                        マトリクスで確認
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs text-teal-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>全要件で内部結合 (ITa) または外部結合 (ITb) テストが充足しています。</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
