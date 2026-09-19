import React, { useMemo, useState } from 'react';
import {
  TestLevel,
  TestStratumCatalog,
  TestStratumCaseEntry,
  TestStratumChapter,
} from '../../../core/models/types.js';
import { ChevronRight, ExternalLink } from 'lucide-react';

type GroupMode = 'document' | 'use_case' | 'functional' | 'non_functional';

interface StratumTestBookPanelProps {
  catalog: TestStratumCatalog;
  activeLevel: TestLevel;
  onOpenDetail: (entry: TestStratumCaseEntry) => void;
  onFilterMatrix: (level: TestLevel) => void;
  /** Renders inside TestBooksView shell (no duplicate chrome). */
  embedded?: boolean;
}

interface CaseGroup {
  key: string;
  label: string;
  cases: TestStratumCaseEntry[];
}

function execBadge(status: TestStratumCaseEntry['execution']['status']) {
  const styles: Record<string, string> = {
    passed: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
    failed: 'bg-rose-950/80 text-rose-300 border-rose-700/50',
    pending: 'bg-slate-800 text-slate-400 border-slate-600/50',
    skipped: 'bg-slate-800 text-slate-500 border-slate-600/50',
  };
  const labels: Record<string, string> = {
    passed: '合格',
    failed: '失敗',
    pending: '未実行',
    skipped: 'SKIP',
  };
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${styles[status] ?? styles.pending}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ReviewTextCell({
  value,
  compact,
}: {
  value?: string;
  compact: boolean;
}) {
  const text = value?.trim() ? value.trim() : '—';
  const isEmpty = text === '—';
  return (
    <td className="px-3 py-2.5 align-top border-t border-slate-800/80 min-w-[14rem] w-[30%]">
      <div
        className={`text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
          isEmpty ? 'text-slate-600 italic' : 'text-slate-200'
        } ${compact && !isEmpty ? 'max-h-32 overflow-hidden relative' : ''}`}
      >
        {text}
      </div>
      {compact && !isEmpty && text.length > 120 && (
        <p className="text-[10px] text-slate-500 mt-1">（折りたたみ中 — 「全文表示」で展開）</p>
      )}
    </td>
  );
}

function SpecResultTable({
  cases,
  onOpenDetail,
  startIndex = 0,
}: {
  cases: TestStratumCaseEntry[];
  onOpenDetail: (entry: TestStratumCaseEntry) => void;
  startIndex?: number;
}) {
  const [compactRows, setCompactRows] = useState(false);

  if (cases.length === 0) {
    return <p className="text-xs text-slate-500 italic py-4">このグループに TC はありません。</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCompactRows(prev => !prev)}
          className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1"
        >
          {compactRows ? '手順・期待値を全文表示' : '手順・期待値を折りたたむ'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full border-collapse text-left min-w-[44rem]">
          <thead>
            <tr className="bg-slate-950/95 text-[10px] uppercase text-slate-500">
              <th className="px-2 py-2 font-bold w-10 border-b border-slate-800">#</th>
              <th className="px-3 py-2 font-bold w-[7rem] border-b border-slate-800">TC</th>
              <th className="px-3 py-2 font-bold min-w-[10rem] border-b border-slate-800">タイトル</th>
              <th className="px-3 py-2 font-bold border-b border-slate-800">手順</th>
              <th className="px-3 py-2 font-bold border-b border-slate-800">期待値</th>
              <th className="px-3 py-2 font-bold w-[4.5rem] border-b border-slate-800">合否</th>
              <th className="px-3 py-2 font-bold w-[4.5rem] border-b border-slate-800">詳細</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((entry, i) => {
              const { sections, execution } = entry;
              const hasData =
                Boolean(entry.parameters?.patterns?.length) || Boolean(entry.parameterFile);
              return (
                <tr key={entry.id} className="hover:bg-slate-900/40 align-top">
                  <td className="px-2 py-2.5 text-[10px] font-mono text-slate-500 border-t border-slate-800/80">
                    {startIndex + i + 1}
                  </td>
                  <td className="px-3 py-2.5 border-t border-slate-800/80">
                    <span className="font-mono text-[11px] font-bold text-teal-300/90">{entry.id}</span>
                    {hasData && (
                      <span className="block text-[9px] text-slate-500 mt-0.5">データあり</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 border-t border-slate-800/80 min-w-[10rem]">
                    <div className="text-[11px] text-slate-200 leading-relaxed">{entry.title}</div>
                  </td>
                  <ReviewTextCell value={sections.steps} compact={compactRows} />
                  <ReviewTextCell value={sections.expectedResults} compact={compactRows} />
                  <td className="px-3 py-2.5 border-t border-slate-800/80">
                    {execBadge(execution.status)}
                  </td>
                  <td className="px-3 py-2.5 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(entry)}
                      className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
                    >
                      開く
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function groupCases(cases: TestStratumCaseEntry[], mode: GroupMode): CaseGroup[] {
  if (mode === 'document') {
    return [{ key: 'document', label: '', cases }];
  }

  if (mode === 'use_case') {
    const byUc = new Map<string, CaseGroup>();
    const unassigned: TestStratumCaseEntry[] = [];
    for (const entry of cases) {
      const ucs = entry.classification?.useCases ?? [];
      if (ucs.length === 0) {
        unassigned.push(entry);
        continue;
      }
      for (const uc of ucs) {
        let group = byUc.get(uc.id);
        if (!group) {
          group = { key: uc.id, label: `${uc.id} — ${uc.title}`, cases: [] };
          byUc.set(uc.id, group);
        }
        if (!group.cases.some(c => c.id === entry.id)) {
          group.cases.push(entry);
        }
      }
    }
    const groups = [...byUc.values()].sort((a, b) => a.key.localeCompare(b.key));
    if (unassigned.length > 0) {
      groups.push({ key: 'uc-unassigned', label: 'ユースケース未割当', cases: unassigned });
    }
    return groups;
  }

  const targetClass = mode === 'functional' ? 'functional' : 'non_functional';
  const matched: TestStratumCaseEntry[] = [];
  const other: TestStratumCaseEntry[] = [];
  for (const entry of cases) {
    const classes = entry.classification?.requirementClasses ?? [];
    if (classes.includes(targetClass)) matched.push(entry);
    else other.push(entry);
  }
  const label =
    mode === 'functional' ? '機能要求（FR）に関連する TC' : '非機能要求（NFR）に関連する TC';
  const groups: CaseGroup[] = [{ key: targetClass, label, cases: matched }];
  if (other.length > 0) {
    groups.push({ key: `${targetClass}-other`, label: '区分外・未リンク', cases: other });
  }
  return groups;
}

function ChapterBook({
  chapter,
  groupMode,
  onOpenDetail,
  onFilterMatrix,
}: {
  chapter: TestStratumChapter;
  groupMode: GroupMode;
  onOpenDetail: (entry: TestStratumCaseEntry) => void;
  onFilterMatrix: (level: TestLevel) => void;
}) {
  const groups = useMemo(
    () => groupCases(chapter.cases, groupMode),
    [chapter.cases, groupMode]
  );

  let rowOffset = 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{chapter.label} — テスト仕様・結果一覧</h2>
          <p className="text-xs text-slate-500 mt-1">
            手順・期待値は省略せず全文表示（折りたたみ可）。前提は詳細モーダルのみ。テストデータ・実行ログは「開く」。
            {chapter.cases.length} 件 · 合格 {chapter.passedCount} · 失敗 {chapter.failedCount}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFilterMatrix(chapter.level)}
          className="text-[10px] font-semibold text-slate-400 hover:text-teal-300 border border-slate-700 hover:border-teal-700/60 rounded-lg px-2 py-1 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          マトリクスでこの層
        </button>
      </div>

      {chapter.cases.length === 0 ? (
        <p className="text-sm text-slate-500 italic py-8 text-center border border-dashed border-slate-800 rounded-xl">
          この工程に登録されたテストケースはありません。
        </p>
      ) : (
        groups.map(group => {
          const start = rowOffset;
          rowOffset += group.cases.length;
          return (
            <section key={group.key} className="space-y-2">
              {group.label && (
                <h3 className="text-xs font-bold text-indigo-300/90 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 shrink-0" />
                  {group.label}
                  <span className="text-slate-500 font-normal">({group.cases.length})</span>
                </h3>
              )}
              <SpecResultTable cases={group.cases} onOpenDetail={onOpenDetail} startIndex={start} />
            </section>
          );
        })
      )}
    </div>
  );
}

export function StratumTestBookPanel({
  catalog,
  activeLevel,
  onOpenDetail,
  onFilterMatrix,
  embedded = false,
}: StratumTestBookPanelProps) {
  const [groupMode, setGroupMode] = React.useState<GroupMode>('document');

  const chapterByLevel = useMemo(() => {
    const map = new Map<TestLevel, TestStratumChapter>();
    for (const ch of catalog.chapters) {
      map.set(ch.level, ch);
    }
    return map;
  }, [catalog.chapters]);

  const activeChapter = chapterByLevel.get(activeLevel);

  const inner = (
    <>
      <div className={`flex flex-col gap-4 ${embedded ? '' : ''}`}>
        <div className="flex rounded-xl border border-slate-700 overflow-hidden shrink-0 flex-wrap w-fit">
          {(
            [
              ['document', '文書順'],
              ['use_case', 'ユースケース'],
              ['functional', '機能要求'],
              ['non_functional', '非機能'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setGroupMode(key)}
              className={`px-3 py-2 text-xs font-semibold ${
                groupMode === key
                  ? 'bg-indigo-950/80 text-indigo-200'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeChapter ? (
        <ChapterBook
          chapter={activeChapter}
          groupMode={groupMode}
          onOpenDetail={onOpenDetail}
          onFilterMatrix={onFilterMatrix}
        />
      ) : (
        <p className="text-sm text-slate-500">工程データを読み込めませんでした。</p>
      )}

      {catalog.unassignedCases.length > 0 && (
        <div className="border border-amber-800/50 rounded-xl p-4 bg-amber-950/20 space-y-2">
          <div className="text-xs font-bold text-amber-300">
            test_level 未設定 ({catalog.unassignedCases.length} 件)
          </div>
          <SpecResultTable cases={catalog.unassignedCases} onOpenDetail={onOpenDetail} />
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-5">{inner}</div>;
  }

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl space-y-5">
      {inner}
    </section>
  );
}
