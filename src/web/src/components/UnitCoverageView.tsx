import React, { useEffect, useState } from 'react';
import { ChevronRight, Code2, FunctionSquare, GitBranch } from 'lucide-react';
import { UnitCoverageReport } from '../../../core/models/types.js';
import type { CoverageFileDetailResponse } from '../../../core/coverage/CoverageDetailBuilder.js';
import { CircularGauge } from './CircularGauge.js';
import { UnitCoverageFileModal } from './UnitCoverageFileModal.js';
import { fetchCoverageFileDetail } from '../utils/coverageFileDetail.js';

interface UnitCoverageViewProps {
  unitCoverage: UnitCoverageReport;
  selectedFilePath: string | null;
  onSelectFilePath: (filePath: string | null) => void;
}

const DENSITY_LABELS: Record<UnitCoverageReport['density'], string> = {
  heavy: '厚い (Heavy)',
  adequate: '適正 (Adequate)',
  thin: '薄い (Thin)',
  missing: '欠落 (Missing)',
};

export function UnitCoverageView({
  unitCoverage,
  selectedFilePath,
  onSelectFilePath,
}: UnitCoverageViewProps) {
  const isPending = unitCoverage.status === 'pending';
  const [fileDetail, setFileDetail] = useState<CoverageFileDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFilePath || isPending) {
      setFileDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setFileDetail(null);

    void fetchCoverageFileDetail(selectedFilePath)
      .then(detail => {
        if (!cancelled) {
          setFileDetail(detail);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setFileDetail(null);
          setDetailError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFilePath, isPending]);

  return (
    <>
      <div className="space-y-6 animate-fadeIn">
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-slate-100 mb-1.5 flex items-center gap-2">
            <FunctionSquare className="w-5 h-5 text-cyan-400" />
            <span>単体テスト実装カバレッジ (Unit Implementation Coverage)</span>
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            ファイル行をクリックすると、実装コードと関連テストコードを並べてモーダル表示します。未実行分岐は赤、実行済みは緑で示します。
          </p>

          {isPending ? (
            <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">
              カバレッジレポート未生成です。`npm --prefix src test` を実行して `reports/coverage-summary.json` を生成してください。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                icon={<FunctionSquare className="w-4 h-4 text-cyan-400" />}
                label="関数テスト率"
                value={Math.round(unitCoverage.functionCoverage * 100)}
                detail={`${unitCoverage.testedFunctions} / ${unitCoverage.totalFunctions} 関数`}
              />
              <MetricCard
                icon={<GitBranch className="w-4 h-4 text-violet-400" />}
                label="分岐網羅率 (C1)"
                value={Math.round(unitCoverage.branchCoverage * 100)}
                detail="branch coverage"
              />
              <MetricCard
                icon={<Code2 className="w-4 h-4 text-teal-400" />}
                label="行カバレッジ (C0)"
                value={Math.round(unitCoverage.lineCoverage * 100)}
                detail={DENSITY_LABELS[unitCoverage.density]}
              />
            </div>
          )}
        </section>

        {!isPending && unitCoverage.modules.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4">モジュール別カバレッジ</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 pr-3">ファイル</th>
                    <th className="py-2 px-3">関数</th>
                    <th className="py-2 px-3">関数%</th>
                    <th className="py-2 px-3">分岐%</th>
                    <th className="py-2 pl-3">未テスト関数</th>
                    <th className="py-2 pl-3 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {unitCoverage.modules.map(mod => (
                    <tr
                      key={mod.filePath}
                      className="border-b border-slate-800/60 text-slate-200 cursor-pointer transition-colors hover:bg-slate-800/40"
                      onClick={() => onSelectFilePath(mod.filePath)}
                    >
                      <td className="py-2 pr-3 font-mono text-[11px]">{mod.filePath}</td>
                      <td className="py-2 px-3 font-mono">
                        {mod.testedFunctionCount}/{mod.functionCount}
                      </td>
                      <td className="py-2 px-3 font-mono">{Math.round(mod.functionCoverage * 100)}%</td>
                      <td className="py-2 px-3 font-mono">{Math.round(mod.branchCoverage * 100)}%</td>
                      <td className="py-2 pl-3 text-slate-400">
                        {mod.untestedFunctions.length > 0
                          ? mod.untestedFunctions.slice(0, 3).join(', ') +
                            (mod.untestedFunctions.length > 3 ? '…' : '')
                          : '—'}
                      </td>
                      <td className="py-2 pl-3 text-cyan-400">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold">
                          詳細
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {selectedFilePath && (
        <UnitCoverageFileModal
          filePath={selectedFilePath}
          detail={fileDetail}
          loading={detailLoading}
          error={detailError}
          onClose={() => onSelectFilePath(null)}
        />
      )}
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4 flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-black text-slate-100 mt-2 font-mono">{value}%</div>
        <div className="text-[11px] text-slate-500 mt-1">{detail}</div>
      </div>
      <CircularGauge value={value} size={56} strokeWidth={5} />
    </div>
  );
}
