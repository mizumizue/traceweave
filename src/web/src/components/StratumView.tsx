import React from 'react';
import { Layers, BookOpen } from 'lucide-react';
import {
  StratumReport,
  PyramidHealthReport,
  TestLevel,
} from '../../../core/models/types.js';
import { VisualTestPyramid } from './VisualTestPyramid.js';
import { CircularGauge } from './CircularGauge.js';

interface StratumViewProps {
  strata: StratumReport[];
  pyramid: PyramidHealthReport;
  onOpenTestBooks: (level: TestLevel) => void;
  onFilterPhase: (phase: string) => void;
}

export function StratumView({
  strata,
  pyramid,
  onOpenTestBooks,
  onFilterPhase,
}: StratumViewProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <VisualTestPyramid
        strata={strata}
        pyramid={pyramid}
        onStratumFocus={onOpenTestBooks}
        onFilterPhase={onFilterPhase}
      />

      <p className="text-xs text-slate-500 flex items-center gap-2 px-1">
        <BookOpen className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
        層をクリックすると「テスト仕様・結果」タブでその工程の一覧を開きます（ピラミッド診断と分離）。
      </p>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-100 mb-1.5 flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-400" />
          <span>各工程地層の詳細データ (Stratum Density Breakdown)</span>
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          内結〜受入は REQ/SPEC トレーサビリティ、単体は関数・分岐カバレッジで地層密度を分析します。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {strata.map(s => {
            const densityColors: Record<StratumReport['density'], string> = {
              heavy: 'bg-teal-950/50 border-teal-500/70 text-teal-300',
              adequate: 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300',
              thin: 'bg-amber-950/50 border-amber-600/60 text-amber-300',
              missing: 'bg-rose-950/50 border-rose-600/60 text-rose-300',
            };

            const densityLabels: Record<StratumReport['density'], string> = {
              heavy: '厚い (Heavy)',
              adequate: '適正 (Adequate)',
              thin: '薄い (Thin)',
              missing: '欠落 (Missing)',
            };

            return (
              <button
                type="button"
                key={s.level}
                onClick={() => onOpenTestBooks(s.level)}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:-translate-y-1 shadow-md text-left ${
                  densityColors[s.density]
                }`}
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">{s.label}</div>
                  <div className="text-3xl font-black mt-2 font-mono">{s.count}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {s.metricSource === 'code_coverage' ? 'テスト済み関数' : '件のテストケース'}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-current/20 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] opacity-80">
                      {s.metricSource === 'code_coverage' ? '関数カバー率' : '要件カバー率'}
                    </div>
                    <div className="text-sm font-black mt-0.5 font-mono">
                      {Math.round(s.coverageRatio * 100)}%
                    </div>
                    {s.branchCoverage !== undefined && (
                      <div className="text-[10px] opacity-70 mt-0.5">
                        分岐 {Math.round(s.branchCoverage * 100)}%
                      </div>
                    )}
                    <div className="text-[10px] font-bold mt-1 uppercase px-1.5 py-0.5 bg-black/40 rounded inline-block">
                      {densityLabels[s.density]}
                    </div>
                  </div>
                  <CircularGauge
                    value={Math.round(s.coverageRatio * 100)}
                    size={46}
                    strokeWidth={4.5}
                    strokeColor={
                      s.density === 'heavy'
                        ? '#2dd4bf'
                        : s.density === 'adequate'
                        ? '#34d399'
                        : s.density === 'thin'
                        ? '#fbbf24'
                        : '#fb7185'
                    }
                    label={`${s.label} ${s.metricSource === 'code_coverage' ? '関数' : '要件'}カバー率`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
