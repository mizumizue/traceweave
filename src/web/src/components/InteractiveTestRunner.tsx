import React, { useState, useEffect } from 'react';
import {
  DocNode,
  TestCasePattern,
  TestRunResult,
} from '../../../core/models/types.js';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Sliders,
  Code2,
  ListOrdered,
  AlertCircle,
  Info,
  Copy,
  Terminal,
  Check,
  FileCode2,
  AlignLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { TestCaseInputAnalyzer } from '../../../core/analyzer/TestCaseInputAnalyzer.js';
import { formatTestRunCommand } from '../../../core/testing/formatTestRunCommand.js';

interface InteractiveTestRunnerProps {
  node: DocNode;
  onTestExecuted?: (result: TestRunResult) => void;
}

export function InteractiveTestRunner({ node, onTestExecuted }: InteractiveTestRunnerProps) {
  const analysis = node.inputAnalysis || TestCaseInputAnalyzer.analyze(node);
  const executable = analysis.isModifiable;
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string, sectionId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (sectionId) {
        setCopiedSection(sectionId);
        setTimeout(() => setCopiedSection(null), 2000);
      }
      toast.success(`${label}をクリップボードにコピーしました`);
    } catch {
      toast.error('クリップボードへのコピーに失敗しました');
    }
  };

  if (!executable) {
    const status = node.execution_status || 'pending';
    const statusColorClass =
      status === 'passed' ? 'text-emerald-400'
      : status === 'failed' ? 'text-rose-400'
      : status === 'skipped' ? 'text-slate-400'
      : 'text-amber-400';
    const testCmd = formatTestRunCommand(node.id);
    return (
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>対話型テスト実行 (Interactive Runner)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800/80 rounded-full font-semibold">
                🔒 スクリプト静的解析: UI入力変更不可
              </span>
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {node.test_level || 'non-unit'} / {node.test_method || 'automated'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/50 text-rose-400 shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100">{analysis.classification}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  {analysis.analysisRule}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11.5px]">
                {analysis.reasonDescription}
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                ※ この判定は AI の推論ではなく決定論的スクリプト（<code className="text-teal-300 font-mono bg-slate-800 px-1 py-0.5 rounded">TestCaseInputAnalyzer</code>）による静的解析結果です。無理に要件を満たすためのモックを行わず、CLI または自動テストスイートで検証されます。
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-black/40 border border-slate-800 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Terminal className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>{testCmd}</span>
            </div>
            <button
              onClick={() => copyToClipboard(testCmd, 'CLIコマンド', 'cli-cmd')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded border border-slate-700 text-[11px] flex items-center gap-1.5 transition shrink-0 active:scale-95"
            >
              {copiedSection === 'cli-cmd' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">コピー済</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>コマンドをコピー</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>検証ステータス: <strong className={statusColorClass}>{status.toUpperCase()}</strong></span>
            <span>検証記録: 上部の「実測値」および「証跡」タブを参照</span>
          </div>
        </div>
      </div>
    );
  }

  const dataset = node.parameters;
  const patterns: TestCasePattern[] = dataset?.patterns || (
    node.id === 'TC-UT-0002' || node.id === 'TC-ITb-0007'
      ? [
          {
            id: 'default-high',
            name: 'デフォルト: High重要度充足',
            inputs: { criticality: 'high', phaseCounts: { unit: 3, integration_internal: 2, integration_external: 1, system: 1, acceptance: 1 } },
            expected: { score: 100, isFullySatisfied: true },
          },
        ]
      : [
          {
            id: 'default-healthy',
            name: 'デフォルト: 健全ピラミッド',
            inputs: { unit: 60, integration_internal: 20, integration_external: 10, system: 5, acceptance: 2 },
            expected: { status: 'healthy', hasWarnings: false },
          },
        ]
  );

  const [selectedPatternId, setSelectedPatternId] = useState<string>(patterns[0]?.id || '');
  const [inputJson, setInputJson] = useState<string>('');
  const [expectedJson, setExpectedJson] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<TestRunResult | null>(null);

  // When node or pattern changes, load pattern inputs into editor
  useEffect(() => {
    const pattern = patterns.find(p => p.id === selectedPatternId) || patterns[0];
    if (pattern) {
      setSelectedPatternId(pattern.id);
      setInputJson(JSON.stringify(pattern.inputs, null, 2));
      setExpectedJson(pattern.expected !== undefined ? JSON.stringify(pattern.expected, null, 2) : '');
      setJsonError(null);
      setLastResult(null);
    }
  }, [node.id, selectedPatternId]);

  const handleSelectPattern = (pattern: TestCasePattern) => {
    setSelectedPatternId(pattern.id);
    setInputJson(JSON.stringify(pattern.inputs, null, 2));
    setExpectedJson(pattern.expected !== undefined ? JSON.stringify(pattern.expected, null, 2) : '');
    setJsonError(null);
    setLastResult(null);
    toast.info(`テストパターン "${pattern.name}" を選択しました`);
  };

  const handleInputChange = (val: string) => {
    setInputJson(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e: any) {
      setJsonError('JSON構文エラー: ' + e.message);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(inputJson);
      setInputJson(JSON.stringify(parsed, null, 2));
      setJsonError(null);
      toast.info('入力JSONをフォーマットしました');
    } catch (e: any) {
      toast.error('無効なJSONのためフォーマットできません', {
        description: e.message,
      });
    }
  };

  const handleReset = () => {
    const p = patterns.find(item => item.id === selectedPatternId) || patterns[0];
    if (p) {
      setInputJson(JSON.stringify(p.inputs, null, 2));
      setExpectedJson(p.expected !== undefined ? JSON.stringify(p.expected, null, 2) : '');
      setJsonError(null);
      toast.info('パラメータを初期値にリセットしました');
    }
  };

  const handleRunTest = async () => {
    let parsedInputs: Record<string, any>;
    try {
      parsedInputs = JSON.parse(inputJson);
    } catch (e: any) {
      const msg = '無効な JSON 入力です: ' + e.message;
      setJsonError(msg);
      toast.error(msg);
      return;
    }

    let parsedExpected: any = undefined;
    if (expectedJson.trim()) {
      try {
        parsedExpected = JSON.parse(expectedJson);
      } catch {
        parsedExpected = expectedJson.trim();
      }
    }

    setIsRunning(true);
    const toastId = toast.loading(`テスト実行中: ${node.id}...`);

    try {
      // 1. Try server endpoint POST /api/test/run
      const res = await fetch('/api/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseId: node.id,
          inputs: parsedInputs,
          expected: parsedExpected,
        }),
      });

      if (res.ok) {
        const result: TestRunResult = await res.json();
        setLastResult(result);
        if (onTestExecuted) onTestExecuted(result);

        if (result.status === 'passed') {
          toast.success(`テスト合格 (PASSED): ${node.id}`, {
            id: toastId,
            description: `期待値と一致しました (${result.durationMs}ms)`,
          });
        } else if (result.status === 'failed') {
          toast.error(`テスト不合格 (FAILED): ${node.id}`, {
            id: toastId,
            description: `期待値との差異を検出しました (${result.durationMs}ms)`,
          });
        } else {
          toast.error(`テストエラー: ${node.id}`, {
            id: toastId,
            description: result.error || '実行時エラー',
          });
        }
      } else {
        let detail = `API returned ${res.status}`;
        try {
          const errorBody = await res.json();
          detail = errorBody.message || errorBody.error || detail;
        } catch {
          // ignore non-JSON error bodies
        }
        throw new Error(detail);
      }
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : 'API unavailable';
      toast.error(`テスト実行に失敗しました: ${node.id}`, {
        id: toastId,
        description: `${detail}。traceweave serve で起動したサーバー API が必要です。`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-slate-950/90 border border-teal-900/40 rounded-xl p-5 space-y-5 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-teal-950 border border-teal-700/60 text-teal-400">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>対話型テスト実行 & リアルタイム実測観測</span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 rounded-full font-semibold">
              ⚡ スクリプト解析: 入力値変更可能
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-900 text-slate-300 border border-slate-800 rounded">
            {analysis.analysisRule.split(':')[0]}
          </span>
          {dataset && (
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              {dataset.name || '外部パラメータセット'} ({dataset.patterns.length} patterns)
            </span>
          )}
        </div>
      </div>

      {/* Script-analyzed modifiable fields badge */}
      {analysis.fields && analysis.fields.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-950/40 border border-teal-800/40 rounded-lg text-xs text-teal-300">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="font-semibold text-[11px] text-teal-200">変更可能パラメータ:</span>
          <div className="flex flex-wrap gap-1.5 font-mono text-[10.5px]">
            {analysis.fields.map(f => (
              <span key={f.name} className="px-1.5 py-0.5 bg-slate-900/80 border border-teal-800/50 rounded text-teal-300">
                {f.name} <span className="opacity-60 text-[9.5px]">({f.type})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 1. Preset Patterns Selector */}
      {dataset && dataset.patterns && dataset.patterns.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
            事前定義テストパターン一覧（複数値の組み合わせ）
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dataset.patterns.map((p, idx) => {
              const isSelected = p.id === selectedPatternId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPattern(p)}
                  className={`p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-950/60 border-teal-500/80 text-teal-200 ring-1 ring-teal-500/50 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span>{p.name}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-teal-900 text-teal-300 rounded font-mono">
                        選択中
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono opacity-75 mt-1.5 truncate">
                    inputs: {JSON.stringify(p.inputs)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Interactive Input Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-teal-400" />
              入力値 (Inputs) - 編集可能
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFormatJson}
                className="text-[11px] text-slate-400 hover:text-teal-300 flex items-center gap-1 transition"
                title="JSONを整形"
              >
                <AlignLeft className="w-3 h-3" /> 整形
              </button>
              <button
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-teal-300 flex items-center gap-1 transition"
                title="初期パターンに戻す"
              >
                <RotateCcw className="w-3 h-3" /> リセット
              </button>
            </div>
          </div>
          <div className="relative">
            <textarea
              value={inputJson}
              onChange={e => handleInputChange(e.target.value)}
              rows={6}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 leading-relaxed shadow-inner"
              placeholder="{ ... }"
            />
            <button
              onClick={() => copyToClipboard(inputJson, '入力値JSON', 'input-json')}
              className="absolute right-2.5 top-2.5 p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 text-xs transition"
              title="入力JSONをコピー"
            >
              {copiedSection === 'input-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          {jsonError && (
            <div className="text-xs text-rose-400 flex items-center gap-1.5 mt-1 bg-rose-950/40 p-1.5 rounded border border-rose-900/50">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              期待値 (Expected)
            </span>
            <button
              onClick={() => copyToClipboard(expectedJson, '期待値JSON', 'expected-json')}
              className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
              title="期待値をコピー"
            >
              {copiedSection === 'expected-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>コピー</span>
            </button>
          </div>
          <div className="relative">
            <textarea
              value={expectedJson}
              onChange={e => setExpectedJson(e.target.value)}
              rows={6}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 leading-relaxed shadow-inner"
              placeholder="{ ... }"
            />
          </div>
        </div>
      </div>

      {/* 3. Run Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        <span className="text-xs text-slate-400">
          パラメータを変更して実行すると、実測値・合否・ログがリアルタイムに観測されます。
        </span>
        <button
          onClick={handleRunTest}
          disabled={isRunning || Boolean(jsonError)}
          className={`px-5 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
            isRunning || Boolean(jsonError)
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 hover:brightness-110'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isRunning ? 'テスト実行中...' : 'テストを手動実行する (Run Test)'}
        </button>
      </div>

      {/* 4. Real-time Observation Results Panel */}
      {lastResult && (
        <div className="mt-4 p-4 rounded-xl border bg-slate-900/95 border-slate-800 space-y-4 animate-fadeIn shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 font-semibold uppercase">実行結果 (Live Result):</span>
              {lastResult.status === 'passed' ? (
                <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-600 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASSED (期待値と一致)
                </span>
              ) : lastResult.status === 'failed' ? (
                <span className="px-3 py-1 bg-rose-950/80 border border-rose-600 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAILED (期待値と不一致)
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-950/80 border border-amber-600 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> ERROR
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span>所要時間: <strong className="text-teal-400 font-mono">{lastResult.durationMs}ms</strong></span>
              <span className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {new Date(lastResult.executedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Expected Result */}
            <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-teal-300 uppercase pb-2 mb-2 border-b border-slate-800 flex items-center justify-between">
                  <span>🎯 期待値 (Expected)</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(lastResult.expected, null, 2), '期待値', 'res-expected')}
                    className="text-slate-500 hover:text-slate-300 transition"
                    title="コピー"
                  >
                    {copiedSection === 'res-expected' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {JSON.stringify(lastResult.expected, null, 2) || '指定なし'}
                </pre>
              </div>
            </div>

            {/* Live Actual Result */}
            <div
              className={`p-3.5 rounded-lg border flex flex-col justify-between ${
                lastResult.status === 'passed'
                  ? 'bg-emerald-950/30 border-emerald-700/60'
                  : 'bg-rose-950/30 border-rose-700/60'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase pb-2 mb-2 border-b border-current/20 flex items-center justify-between">
                  <span>⚡ 実測値 (Live Actual)</span>
                  <div className="flex items-center gap-2">
                    {lastResult.isMatch ? (
                      <span className="text-emerald-400 font-bold">✔ 一致 (PASSED)</span>
                    ) : (
                      <span className="text-rose-400 font-bold">✖ 差異あり (FAILED)</span>
                    )}
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(lastResult.actual, null, 2), '実測値', 'res-actual')}
                      className="text-slate-400 hover:text-slate-200 transition"
                      title="コピー"
                    >
                      {copiedSection === 'res-actual' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <pre className="text-slate-100 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {JSON.stringify(lastResult.actual, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Execution logs */}
          {lastResult.logs && lastResult.logs.length > 0 && (
            <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>実行ログ (Execution Trace)</span>
                <button
                  onClick={() => copyToClipboard(lastResult.logs.join('\n'), '実行ログ', 'res-logs')}
                  className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1 transition"
                >
                  {copiedSection === 'res-logs' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>ログコピー</span>
                </button>
              </div>
              <div className="space-y-1 text-[11.5px] text-slate-300 font-mono bg-black/40 p-2.5 rounded border border-slate-900 max-h-40 overflow-y-auto">
                {lastResult.logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-teal-500 select-none">›</span>
                    <span className={log.includes('FAILED') || log.includes('✖') ? 'text-rose-300 font-bold' : log.includes('PASSED') ? 'text-emerald-300' : ''}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
