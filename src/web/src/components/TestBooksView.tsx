import React, { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import {
  DocNode,
  RequirementSufficiency,
  TestLevel,
  TestStratumCatalog,
  TestStratumCaseEntry,
  UnitCoverageReport,
} from '../../../core/models/types.js';
import { buildTestStratumCatalog } from '../../../core/testing/buildTestStratumCatalog.js';
import { resolveSpecBookLevel } from '../../../core/testing/resolveSpecBookLevel.js';
import {
  TEST_BOOK_TAB_LEVELS,
  TEST_LEVEL_SHORT_LABELS,
} from '../../../core/testing/testLevelLabels.js';
import { StratumTestBookPanel } from './StratumTestBookPanel.js';
import { StratumTestCaseDetailModal } from './StratumTestCaseDetailModal.js';
import { UnitCoverageView } from './UnitCoverageView.js';

interface TestBooksViewProps {
  testStratumCatalog?: TestStratumCatalog;
  nodes?: DocNode[];
  requirements?: RequirementSufficiency[];
  unitCoverage?: UnitCoverageReport;
  activeLevel: TestLevel;
  onActiveLevelChange: (level: TestLevel) => void;
  onSelectNode: (id: string) => void;
  onFilterMatrix: (level: TestLevel) => void;
  unitCoverageFile: string | null;
  onSelectUnitCoverageFile: (filePath: string | null) => void;
}

function findCaseEntry(catalog: TestStratumCatalog, id: string): TestStratumCaseEntry | undefined {
  for (const ch of catalog.chapters) {
    const hit = ch.cases.find(c => c.id === id);
    if (hit) return hit;
  }
  return catalog.unassignedCases.find(c => c.id === id);
}

export function TestBooksView({
  testStratumCatalog,
  nodes = [],
  requirements = [],
  unitCoverage,
  activeLevel,
  onActiveLevelChange,
  onSelectNode,
  onFilterMatrix,
  unitCoverageFile,
  onSelectUnitCoverageFile,
}: TestBooksViewProps) {
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null);

  const catalog = useMemo(
    () => testStratumCatalog ?? buildTestStratumCatalog(nodes, requirements),
    [testStratumCatalog, nodes, requirements]
  );

  const specBookLevel = useMemo(
    () => resolveSpecBookLevel(catalog, activeLevel),
    [catalog, activeLevel]
  );

  const showUnitCoverage = activeLevel === 'unit';

  const detailEntry = useMemo(() => {
    if (!detailCaseId) return null;
    return findCaseEntry(catalog, detailCaseId) ?? null;
  }, [catalog, detailCaseId]);

  const unitCoveragePercent =
    unitCoverage && unitCoverage.status !== 'pending'
      ? Math.round(unitCoverage.functionCoverage * 100)
      : undefined;

  return (
    <div className="animate-fadeIn space-y-0">
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            テスト仕様・結果
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {showUnitCoverage
              ? '単体（UT）は関数・分岐の実装カバレッジで評価します（REQ-0031）。'
              : '内結〜受入の TC 文書（手順・期待値）の QA レビュー用です。'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TEST_BOOK_TAB_LEVELS.map(level => {
            const isActive = activeLevel === level;
            const short = TEST_LEVEL_SHORT_LABELS[level];
            const isUnit = level === 'unit';
            const ch = catalog.chapters.find(c => c.level === level);
            const count = isUnit ? undefined : ch?.cases.length ?? 0;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onActiveLevelChange(level)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                  isActive
                    ? isUnit
                      ? 'bg-cyan-950/60 border-cyan-600/60 text-cyan-200'
                      : 'bg-teal-950/60 border-teal-600/60 text-teal-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="font-mono">{short}</span>
                {isUnit ? (
                  <span className="text-slate-500 font-normal ml-1.5">
                    ({unitCoveragePercent !== undefined ? `${unitCoveragePercent}%` : '—'})
                  </span>
                ) : (
                  <span className="text-slate-500 font-normal ml-1.5">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {showUnitCoverage ? (
          unitCoverage ? (
            <UnitCoverageView
              embedded
              unitCoverage={unitCoverage}
              selectedFilePath={unitCoverageFile}
              onSelectFilePath={onSelectUnitCoverageFile}
            />
          ) : (
            <p className="text-sm text-slate-500">単体カバレッジデータを読み込めませんでした。</p>
          )
        ) : (
          <StratumTestBookPanel
            embedded
            catalog={catalog}
            activeLevel={specBookLevel}
            onOpenDetail={entry => setDetailCaseId(entry.id)}
            onFilterMatrix={onFilterMatrix}
          />
        )}
      </section>

      {detailEntry && (
        <StratumTestCaseDetailModal
          entry={detailEntry}
          onClose={() => setDetailCaseId(null)}
          onSelectNode={onSelectNode}
        />
      )}
    </div>
  );
}
