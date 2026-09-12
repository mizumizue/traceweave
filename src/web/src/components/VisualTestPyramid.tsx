import React from 'react';
import { StratumReport, PyramidHealthReport, TestLevel } from '../../../core/models/types.js';
import { CircularGauge } from './CircularGauge.js';
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldCheck,
  TrendingUp,
  Filter,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface VisualTestPyramidProps {
  strata: StratumReport[];
  pyramid: PyramidHealthReport;
  onFilterPhase?: (phase: string) => void;
}

export function VisualTestPyramid({ strata, pyramid, onFilterPhase }: VisualTestPyramidProps) {
  // Map strata by level for fast lookup
  const strataMap = new Map<TestLevel, StratumReport>();
  let totalTests = 0;
  for (const s of strata) {
    strataMap.set(s.level, s);
    totalTests += s.count;
  }

  // Layers from top of pyramid to base (V-Model descending order)
  const pyramidLayers: { level: TestLevel; shortLabel: string; name: string; widthPercent: number }[] = [
    { level: 'acceptance', shortLabel: 'UAT', name: '受入テスト (Acceptance)', widthPercent: 35 },
    { level: 'system', shortLabel: 'ST', name: '総合テスト (System)', widthPercent: 50 },
    { level: 'integration_external', shortLabel: 'ITb', name: '外部結合テスト (Integration Ext)', widthPercent: 65 },
    { level: 'integration_internal', shortLabel: 'ITa', name: '内部結合テスト (Integration Int)', widthPercent: 80 },
    { level: 'unit', shortLabel: 'UT', name: '単体テスト (Unit)', widthPercent: 96 },
  ];

  const statusConfig = {
    healthy: {
      label: '健全 (Healthy Pyramid)',
      badgeBg: 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      desc: '単体テストを土台とし、上位工程に進むほど絞り込まれる理想的なピラミッド分布を維持しています。',
    },
    inverted_ice_cream: {
      label: '逆ピラミッド型 (Inverted Ice-Cream)',
      badgeBg: 'bg-rose-950/80 border-rose-600/70 text-rose-300',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      desc: '単体テストが薄く、受入・総合テストに過度な負荷が集中しているアンチパターンです。フィードバック遅延と実行コスト増大のリスクがあります。',
    },
    hollow_hourglass: {
      label: '結合層空洞化 (Hollow Hourglass)',
      badgeBg: 'bg-amber-950/80 border-amber-600/70 text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      desc: '単体と総合は存在するものの、中間層（内部・外部結合テスト）が不足しており、モジュール間連携のバグが総合テストで露呈しやすい状態です。',
    },
    missing_specs: {
      label: '仕様欠落リスク (Missing Specs)',
      badgeBg: 'bg-amber-950/80 border-amber-600/70 text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      desc: 'テスト対象となる詳細仕様または要件定義のトレーサビリティが一部不十分です。',
    },
  };

  const currentStatus = statusConfig[pyramid.status] || statusConfig.healthy;

  const densityStyles = {
    heavy: {
      bg: 'from-teal-900/40 to-teal-800/30 border-teal-500/60 text-teal-200',
      tag: 'bg-teal-950 text-teal-300 border-teal-700/60',
      tagLabel: '充実 (Heavy)',
    },
    adequate: {
      bg: 'from-emerald-900/40 to-emerald-800/30 border-emerald-500/60 text-emerald-200',
      tag: 'bg-emerald-950 text-emerald-300 border-emerald-700/60',
      tagLabel: '適正 (Adequate)',
    },
    thin: {
      bg: 'from-amber-900/40 to-amber-800/30 border-amber-500/60 text-amber-200',
      tag: 'bg-amber-950 text-amber-300 border-amber-700/60',
      tagLabel: '不足気味 (Thin)',
    },
    missing: {
      bg: 'from-rose-900/40 to-rose-800/30 border-rose-500/60 text-rose-200',
      tag: 'bg-rose-950 text-rose-300 border-rose-700/60',
      tagLabel: '欠落 (Missing)',
    },
  };

  const handleLayerClick = (level: string, label: string) => {
    if (onFilterPhase) {
      onFilterPhase(level);
      toast.info(`マトリクスを "${label}" で絞り込みました`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Diagnostic Status Card */}
      <div className={`p-5 rounded-2xl border ${currentStatus.badgeBg} shadow-lg backdrop-blur-md`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-black/40 border border-current/20">
              {currentStatus.icon}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold opacity-80">
                テストピラミッド診断結果
              </div>
              <div className="text-lg font-black mt-0.5 tracking-tight flex items-center gap-2">
                <span>{currentStatus.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono bg-black/30 px-3 py-1.5 rounded-lg border border-current/20">
            <span>総テスト数:</span>
            <strong className="text-white text-sm">{totalTests}</strong>
            <span className="opacity-70">cases</span>
          </div>
        </div>
        <p className="text-xs mt-3 leading-relaxed opacity-90 pl-1 border-l-2 border-current">
          {currentStatus.desc}
        </p>
      </div>

      {/* Visual Pyramid Stacking Graphic */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span>テストピラミッド層別ボリューム & 要件充足度</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              各層をクリックすると、マトリクスの該当工程テストを瞬時に絞り込み表示できます。
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            V-Model Test Strata
          </span>
        </div>

        {/* The visual pyramid layers */}
        <div className="flex flex-col items-center gap-2 py-4">
          {pyramidLayers.map(layer => {
            const data = strataMap.get(layer.level) || {
              level: layer.level,
              label: layer.name,
              count: 0,
              coverageRatio: 0,
              density: 'missing' as const,
            };
            const style = densityStyles[data.density] || densityStyles.adequate;
            const ratioPercent = Math.round(data.coverageRatio * 100);
            const testPercent = totalTests > 0 ? Math.round((data.count / totalTests) * 100) : 0;

            return (
              <div
                key={layer.level}
                style={{ width: `${layer.widthPercent}%` }}
                onClick={() => handleLayerClick(layer.level, data.label)}
                className={`group cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] min-w-[280px] bg-gradient-to-r ${style.bg} border rounded-xl p-3 shadow-md flex items-center justify-between gap-3`}
                title={`${data.label}: ${data.count}件 (${testPercent}%) - クリックで絞り込み`}
              >
                {/* Left: Level label */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {layer.shortLabel}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                      <span>{layer.name}</span>
                      <Filter className="w-3 h-3 opacity-0 group-hover:opacity-100 text-teal-300 transition shrink-0" />
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-white text-xs">{data.count}</span>
                      <span className="opacity-75">件 ({testPercent}%)</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${style.tag}`}>
                        {style.tagLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Circular gauge for requirement coverage */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-slate-300 opacity-80 uppercase">要件カバー率</div>
                    <div className="text-xs font-mono font-bold text-white">{ratioPercent}%</div>
                  </div>
                  <CircularGauge
                    value={ratioPercent}
                    size={38}
                    strokeWidth={4}
                    label={`${data.label} カバー率`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-400" />
            理想的な構成比: 単体テスト (UT) が 60%〜70% 以上を占め、最上層 (UAT) が 5%〜10% に収束する形態
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            底辺: 単体(UT) ──› 頂点: 受入(UAT)
          </span>
        </div>
      </div>

      {/* Warnings & Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pyramid.warnings.length > 0 ? (
          <div className="p-5 bg-amber-950/30 border border-amber-800/60 rounded-2xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>検出されたリスク・警告 ({pyramid.warnings.length}件)</span>
            </div>
            <div className="space-y-2">
              {pyramid.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-amber-950/50 border border-amber-800/50 rounded-xl text-xs text-amber-200 leading-relaxed"
                >
                  {w}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-emerald-300">警告事項はありません</div>
              <div className="text-xs text-slate-400 mt-0.5">ピラミッドアンチパターンは検知されませんでした。</div>
            </div>
          </div>
        )}

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>改善アクション提案 ({pyramid.suggestions.length}件)</span>
          </div>
          <div className="space-y-2">
            {pyramid.suggestions.map((s, idx) => (
              <div
                key={idx}
                className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-xs text-cyan-200 leading-relaxed"
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
