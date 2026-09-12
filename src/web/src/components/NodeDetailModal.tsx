import React, { useState, useEffect } from 'react';
import {
  DocNode,
  DecisionsCatalog,
  RequirementSufficiency,
  TestRunResult,
} from '../../../core/models/types.js';
import { buildFullUrl } from '../utils/urlState.js';
import { CircularGauge } from './CircularGauge.js';
import { InteractiveTestRunner } from './InteractiveTestRunner.js';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Link as LinkIcon,
  Zap,
  ClipboardCheck,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  FolderOpen,
} from 'lucide-react';

export interface NodeDetailModalProps {
  node: DocNode;
  nodeMap: Map<string, DocNode>;
  catalog?: DecisionsCatalog;
  requirements?: RequirementSufficiency[];
  onSelectNode: (id: string) => void;
  onClose: () => void;
  onBack?: () => void;
  onForward?: () => void;
}

export function NodeDetailModal({
  node,
  nodeMap,
  catalog,
  requirements,
  onSelectNode,
  onClose,
  onBack,
  onForward,
}: NodeDetailModalProps) {
  const isTestCase = node.kind === 'test_case';
  const isRequirement = node.kind === 'requirement';
  const reqSufficiency = isRequirement && requirements ? requirements.find(r => r.requirementId === node.id) : null;
  const catalogItem = catalog?.items.find(i => i.id === node.id);
  const [liveRunResult, setLiveRunResult] = useState<TestRunResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // History stack for back/forward navigation within the modal
  const [history, setHistory] = useState<string[]>([node.id]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // When external node prop changes from outside
  useEffect(() => {
    if (history[historyIndex] !== node.id) {
      setHistory(prev => [...prev.slice(0, historyIndex + 1), node.id]);
      setHistoryIndex(prev => prev + 1);
    }
  }, [node.id]);

  const handleNavigate = (targetId: string) => {
    onSelectNode(targetId);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (historyIndex > 0) {
      if (typeof window !== 'undefined' && window.history) {
        window.history.back();
      } else {
        const prevId = history[historyIndex - 1];
        setHistoryIndex(historyIndex - 1);
        onSelectNode(prevId);
      }
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward();
      return;
    }
    if (historyIndex < history.length - 1) {
      if (typeof window !== 'undefined' && window.history) {
        window.history.forward();
      } else {
        const nextId = history[historyIndex + 1];
        setHistoryIndex(historyIndex + 1);
        onSelectNode(nextId);
      }
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const effectiveStatus = liveRunResult ? liveRunResult.status : (node.execution_status || 'pending');

  const copyToClipboard = (text: string, label: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
    toast.success(`${label}をコピーしました`);
  };

  const kindBadgeColors: Record<string, string> = {
    need: 'bg-pink-950 text-pink-300 border-pink-700/60',
    requirement: 'bg-emerald-950 text-emerald-300 border-emerald-700/60',
    specification: 'bg-cyan-950 text-cyan-300 border-cyan-700/60',
    design: 'bg-indigo-950 text-indigo-300 border-indigo-700/60',
    decision: 'bg-amber-950 text-amber-300 border-amber-700/60',
    quality_assurance: 'bg-teal-950 text-teal-300 border-teal-700/60',
    test_case: 'bg-purple-950 text-purple-300 border-purple-700/60',
    actor: 'bg-blue-950 text-blue-300 border-blue-700/60',
    use_case: 'bg-violet-950 text-violet-300 border-violet-700/60',
  };

  const statusBadge =
    effectiveStatus === 'passed' ? (
      <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-600 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASSED (合格)
      </span>
    ) : effectiveStatus === 'failed' ? (
      <span className="px-2.5 py-1 bg-rose-950 border border-rose-600 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
        <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAILED (不合格)
      </span>
    ) : (
      <span className="px-2.5 py-1 bg-amber-950 border border-amber-600 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
        <Clock className="w-3.5 h-3.5 text-amber-400" /> PENDING (保留)
      </span>
    );

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 animate-fadeIn"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-modalPop"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/80 gap-3">
          <div className="space-y-1.5 flex-1 pr-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Back / Forward navigation */}
              <div className="flex items-center gap-1 mr-1">
                <button
                  onClick={handleBack}
                  disabled={historyIndex === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="戻る"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="進む"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span
                className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${
                  kindBadgeColors[node.kind] || 'bg-slate-800 text-slate-300'
                }`}
              >
                {node.kind}
              </span>

              <div className="flex items-center gap-1">
                <span className="text-xl font-bold font-mono text-slate-100">{node.id}</span>
                <button
                  onClick={() => copyToClipboard(node.id, 'ID', 'modal-id')}
                  className="text-slate-500 hover:text-slate-200 p-1 rounded transition"
                  title="IDをコピー"
                >
                  {copiedKey === 'modal-id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {isTestCase && statusBadge}
            </div>

            <h2 className="text-base font-bold text-slate-200 leading-snug">{node.title}</h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {reqSufficiency && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
                <CircularGauge
                  value={reqSufficiency.score}
                  size={42}
                  strokeWidth={4}
                  label="要件品質充足率"
                />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">品質充足度</div>
                  <div className="text-xs font-bold text-slate-200">
                    {reqSufficiency.isFullySatisfied ? '充足' : '未完全'}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                const fullUrl = buildFullUrl({ nodeId: node.id });
                navigator.clipboard.writeText(fullUrl);
                toast.success(`${node.id} の共有URLをコピーしました`, {
                  description: fullUrl,
                });
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white flex items-center gap-1 text-xs transition border border-slate-700/60"
              title="このノードの共有URLをコピー"
            >
              <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">URL</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center font-bold text-sm transition"
              title="閉じる (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">ステータス</span>
              <span className="font-medium text-slate-200 mt-0.5 block capitalize">{node.status}</span>
            </div>
            {node.criticality && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">重要度</span>
                <span className="font-bold text-amber-400 mt-0.5 block uppercase">{node.criticality}</span>
              </div>
            )}
            {node.test_level && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">テスト工程</span>
                <span className="font-bold text-teal-400 mt-0.5 block uppercase">{node.test_level}</span>
              </div>
            )}
            {node.test_method && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">テスト手法</span>
                <span className="font-bold text-blue-400 mt-0.5 block uppercase">{node.test_method}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">作成日 / 更新日</span>
              <span className="text-slate-400 mt-0.5 block font-mono">
                {node.created} {node.updated && `/ ${node.updated}`}
              </span>
            </div>
          </div>

          {/* Traceability & Cross-Cutting Connections */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-teal-400" />
              <span>トレーサビリティ & 横断決め事接続 (Relationships)</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {node.depends_on && node.depends_on.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">依存先 (depends_on):</span>
                  {node.depends_on.map(depId => (
                    <button
                      key={depId}
                      onClick={() => handleNavigate(depId)}
                      className="text-cyan-400 hover:underline font-mono font-bold hover:text-cyan-300 transition"
                      title="このノードへ移動"
                    >
                      {depId}
                    </button>
                  ))}
                </div>
              )}
              {node.verifies && node.verifies.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">検証対象 (verifies):</span>
                  {node.verifies.map(vId => (
                    <button
                      key={vId}
                      onClick={() => handleNavigate(vId)}
                      className="text-emerald-400 hover:underline font-mono font-bold hover:text-emerald-300 transition"
                      title="このノードへ移動"
                    >
                      {vId}
                    </button>
                  ))}
                </div>
              )}
              {/* Related Actors */}
              {catalogItem?.relatedActors && catalogItem.relatedActors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-violet-900/60">
                  <span className="text-violet-400">👤 アクター:</span>
                  {catalogItem.relatedActors.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => handleNavigate(ref.id)}
                      className="text-violet-300 hover:underline font-mono font-bold hover:text-violet-200 transition"
                      title={`${ref.title} (${ref.id})`}
                    >
                      {ref.id}
                    </button>
                  ))}
                </div>
              )}
              {/* Related Use Cases */}
              {catalogItem?.relatedUseCases && catalogItem.relatedUseCases.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-indigo-900/60">
                  <span className="text-indigo-400">🎯 ユースケース:</span>
                  {catalogItem.relatedUseCases.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => handleNavigate(ref.id)}
                      className="text-indigo-300 hover:underline font-mono font-bold hover:text-indigo-200 transition"
                      title={`${ref.title} (${ref.id})`}
                    >
                      {ref.id}
                    </button>
                  ))}
                </div>
              )}
              {/* Related Decisions (ADR) */}
              {catalogItem?.relatedDecisions && catalogItem.relatedDecisions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-amber-900/60">
                  <span className="text-amber-400">⚖️ 意思決定 (ADR):</span>
                  {catalogItem.relatedDecisions.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => handleNavigate(ref.id)}
                      className="text-amber-300 hover:underline font-mono font-bold hover:text-amber-200 transition"
                      title={`${ref.title} (${ref.id})`}
                    >
                      {ref.id}
                    </button>
                  ))}
                </div>
              )}
              {/* Related Designs */}
              {catalogItem?.relatedDesigns && catalogItem.relatedDesigns.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-blue-900/60">
                  <span className="text-blue-400">🏗️ 設計 (DSN):</span>
                  {catalogItem.relatedDesigns.map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => handleNavigate(ref.id)}
                      className="text-blue-300 hover:underline font-mono font-bold hover:text-blue-200 transition"
                      title={`${ref.title} (${ref.id})`}
                    >
                      {ref.id}
                    </button>
                  ))}
                </div>
              )}
              {/* Direct links if any */}
              {node.links && node.links.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">リンク (links):</span>
                  {node.links.map(linkId => (
                    <button
                      key={linkId}
                      onClick={() => handleNavigate(linkId)}
                      className="text-slate-300 hover:underline font-mono font-bold hover:text-white transition"
                      title="このノードへ移動"
                    >
                      {linkId}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Test Case Details */}
          {isTestCase ? (
            <div className="space-y-5">
              {/* Scope & Procedure */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-teal-400" />
                  何をテストするのか (Test Scope & Procedure)
                </div>

                {node.sections?.['Objective'] && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">検証目的 (Objective)</div>
                    <p className="text-sm text-slate-200 mt-1 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      {node.sections['Objective']}
                    </p>
                  </div>
                )}

                {node.sections?.['Preconditions'] && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">前提条件 (Preconditions)</div>
                    <div className="text-xs text-slate-300 mt-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 font-mono">
                      {node.sections['Preconditions']}
                    </div>
                  </div>
                )}

                {node.sections?.['Steps'] && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">実施手順 (Steps)</div>
                    <div className="text-xs text-slate-300 mt-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
                      {node.sections['Steps']}
                    </div>
                  </div>
                )}
              </div>

              {/* Expected Results vs Actual Results */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  期待値と実測値の観測対比 (Expected vs Actual Observation)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Expected Card */}
                  <div className="bg-teal-950/20 border border-teal-800/60 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-teal-800/40">
                        <span className="text-xs font-bold text-teal-300 uppercase">期待値 (Expected)</span>
                        <span className="text-[10px] font-mono text-teal-400/80">SPEC CRITERIA</span>
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {node.sections?.['Expected Results'] || '期待値の定義なし'}
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-teal-800/30 text-[10px] text-teal-400">
                      ✔ 仕様要求に合致する振る舞い
                    </div>
                  </div>

                  {/* Actual Card */}
                  <div
                    className={`rounded-xl p-4 flex flex-col justify-between border ${
                      effectiveStatus === 'passed'
                        ? 'bg-emerald-950/20 border-emerald-700/60'
                        : effectiveStatus === 'failed'
                        ? 'bg-rose-950/20 border-rose-700/60'
                        : 'bg-amber-950/20 border-amber-700/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/20">
                        <span className="text-xs font-bold uppercase text-slate-200">
                          実測値 (Actual Results) {liveRunResult && <span className="text-[10px] text-teal-400 font-normal">● Live Run</span>}
                        </span>
                        {statusBadge}
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono bg-black/30 p-2.5 rounded-lg border border-current/20">
                        {liveRunResult
                          ? JSON.stringify(liveRunResult.actual, null, 2)
                          : node.sections?.['Actual Results'] || node.actual_result || '実測ログの記録なし (pending)'}
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-current/20 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>観測ステータス: <strong className={effectiveStatus === 'failed' ? 'text-rose-400' : 'text-emerald-400'}>{effectiveStatus.toUpperCase()}</strong></span>
                      <span>{liveRunResult ? `実行所要時間: ${liveRunResult.durationMs}ms` : '初期検証ログ'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Test Runner */}
              <InteractiveTestRunner node={node} onTestExecuted={res => setLiveRunResult(res)} />

              {/* Evidence */}
              {node.sections?.['Evidence'] && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">エビデンス・証跡 (Evidence)</div>
                  <div className="text-xs text-slate-300 mt-1 font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    {node.sections['Evidence']}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* General Sections View for Need, Requirement, Spec, Design */
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                ドキュメント詳細セクション
              </div>

              {node.sections && Object.keys(node.sections).length > 0 ? (
                Object.entries(node.sections).map(([title, content]) => (
                  <div key={title} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-2">
                      {title}
                    </h3>
                    <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {String(content)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 whitespace-pre-wrap font-mono">
                  {node.content}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full">
            <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-mono text-[11px] truncate">{node.filePath || node.id}</span>
            {node.filePath && (
              <button
                onClick={() => copyToClipboard(node.filePath!, 'ファイルパス', 'modal-path')}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition shrink-0"
                title="ファイルパスをコピー"
              >
                {copiedKey === 'modal-path' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const md = `# ${node.id}: ${node.title}\n\n${node.content}`;
                copyToClipboard(md, 'ノード内容(Markdown)');
              }}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition flex items-center gap-1.5"
            >
              <Copy className="w-3 h-3" />
              <span>Markdownコピー</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-semibold transition"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
