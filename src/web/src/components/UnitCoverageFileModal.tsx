import React, { useEffect, useState } from 'react';
import { FlaskConical, GitBranch, Loader2, X } from 'lucide-react';
import type {
  CoverageFileDetailResponse,
  CoverageLineDetail,
  LineCoverageStatus,
} from '../../../core/coverage/CoverageDetailBuilder.js';
import { isModalEscapeKey, isModalOverlayClick } from './modalNavigation.js';

interface UnitCoverageFileModalProps {
  filePath: string;
  detail: CoverageFileDetailResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const STATUS_LABELS: Record<LineCoverageStatus, string> = {
  covered: 'テストで実行済み',
  uncovered: '未実行（要テスト）',
  partial: '分岐の一部のみ実行',
  none: '計測対象外',
};

const STATUS_CLASS: Record<LineCoverageStatus, string> = {
  covered: 'bg-[#0f3d24] border-l-[3px] border-[#34d399] text-slate-100',
  uncovered: 'bg-[#4a1520] border-l-[3px] border-[#fb7185] text-slate-100',
  partial: 'bg-[#422f08] border-l-[3px] border-[#fbbf24] text-slate-100',
  none: 'border-l-[3px] border-transparent text-slate-400',
};

/** Header + legend; keep in sync with h-[calc(92vh-...)] below. */
const CODE_AREA_HEIGHT = 'calc(92vh - 10.5rem)';

export function UnitCoverageFileModal({
  filePath,
  detail,
  loading,
  error,
  onClose,
}: UnitCoverageFileModalProps) {
  const [activeTestIndex, setActiveTestIndex] = useState(0);

  useEffect(() => {
    setActiveTestIndex(0);
  }, [filePath]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalEscapeKey(e.key)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const source = detail?.source;
  const testFiles = detail?.testFiles ?? [];
  const activeTest = testFiles[activeTestIndex];
  const uncoveredBranches = source?.branches.filter(branch => !branch.covered).length ?? 0;
  const totalBranches = source?.branches.length ?? 0;

  return (
    <div
      onClick={e => {
        if (isModalOverlayClick(e.target, e.currentTarget)) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 animate-fadeIn"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl animate-modalPop xl:max-w-7xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 bg-slate-900 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">実装カバレッジ詳細</p>
            <h3 className="mt-1 break-all font-mono text-sm font-bold text-slate-100">{filePath}</h3>
            {source && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                <GitBranch className="h-3.5 w-3.5 text-violet-300" />
                分岐 {totalBranches > 0 ? `${totalBranches - uncoveredBranches}/${totalBranches} 実行` : 'なし'}
                {testFiles.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-sky-300">
                    <FlaskConical className="h-3.5 w-3.5" />
                    関連テスト {testFiles.length} 件
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
            aria-label="詳細を閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-slate-800 bg-slate-900/80 px-5 py-3">
          <div className="flex flex-wrap gap-4 text-xs text-slate-200">
            {(['covered', 'partial', 'uncovered', 'none'] as LineCoverageStatus[]).map(status => (
              <span key={status} className="inline-flex items-center gap-2">
                <span className={`inline-block h-3 w-8 rounded-sm ${STATUS_CLASS[status].split(' ').slice(0, 2).join(' ')}`} />
                {STATUS_LABELS[status]}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0 overflow-hidden" style={{ height: CODE_AREA_HEIGHT, minHeight: '280px' }}>
          {loading && (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              ソースとテストコードを読み込み中...
            </div>
          )}

          {!loading && error && (
            <div className="h-full overflow-y-auto p-6 text-sm text-rose-200">{error}</div>
          )}

          {!loading && !error && !source && (
            <div className="flex h-full items-center justify-center p-6 text-sm text-slate-400">
              カバレッジ詳細を取得できませんでした。
            </div>
          )}

          {!loading && source && (
            <div className="flex h-full flex-col divide-y divide-slate-800 overflow-hidden lg:flex-row lg:divide-y-0 lg:divide-x">
              <CodePanel title="実装コード" subtitle="色付き行はテスト実行結果（V8 分岐）">
                {source.lines.map(line => (
                  <CoverageCodeLine key={line.lineNumber} line={line} />
                ))}
              </CodePanel>

              <CodePanel
                title="テストコード"
                subtitle={
                  testFiles.length > 0
                    ? 'この実装を import しているテスト'
                    : '関連テストが見つかりませんでした'
                }
                headerExtra={
                  testFiles.length > 1 ? (
                    <label className="flex w-full flex-col gap-1">
                      <span className="text-[10px] text-slate-400">関連テストファイル</span>
                      <select
                        value={activeTestIndex}
                        onChange={e => setActiveTestIndex(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[11px] text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        aria-label="関連テストファイルを選択"
                      >
                        {testFiles.map((testFile, index) => (
                          <option key={testFile.filePath} value={index} className="bg-slate-900">
                            {testFile.filePath}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : activeTest ? (
                    <span className="truncate font-mono text-[10px] text-sky-300">{activeTest.filePath}</span>
                  ) : null
                }
              >
                {activeTest ? (
                  activeTest.lines.map(line => (
                    <PlainCodeLine key={line.lineNumber} line={line} />
                  ))
                ) : (
                  <div className="p-4 text-xs leading-relaxed text-slate-400">
                    tests/ 配下でこのファイルを import する .test.ts が無いか、import パスが一致していません。
                  </div>
                )}
              </CodePanel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodePanel({
  title,
  subtitle,
  headerExtra,
  children,
}: {
  title: string;
  subtitle: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/60 px-4 py-2">
        <div className="flex flex-col gap-2">
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-100">{title}</h4>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
          {headerExtra}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#0b1220]">
        <pre className="font-mono text-[11px] leading-5">{children}</pre>
      </div>
    </section>
  );
}

function CoverageCodeLine({ line }: { line: CoverageLineDetail }) {
  return (
    <div className={`flex ${STATUS_CLASS[line.status]}`}>
      <span className="w-11 shrink-0 select-none pr-3 text-right text-slate-500">{line.lineNumber}</span>
      <code className="flex-1 whitespace-pre pr-4">{line.text || ' '}</code>
    </div>
  );
}

function PlainCodeLine({ line }: { line: { lineNumber: number; text: string } }) {
  return (
    <div className="flex border-l-[3px] border-transparent text-slate-200 hover:bg-slate-800/40">
      <span className="w-11 shrink-0 select-none pr-3 text-right text-slate-500">{line.lineNumber}</span>
      <code className="flex-1 whitespace-pre pr-4">{line.text || ' '}</code>
    </div>
  );
}
