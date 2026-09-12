import { TraceGraph } from '../graph/TraceGraph.js';
import {
  PyramidHealth,
  PyramidHealthReport,
  RequirementSufficiency,
  StratumDensity,
  StratumReport,
  TestLevel,
  PhaseCount,
} from '../models/types.js';

const PHASE_LABELS: Record<TestLevel, string> = {
  unit: '単体テスト (UT)',
  integration_internal: '内部結合テスト (ITa)',
  integration_external: '外部結合テスト (ITb)',
  system: 'システムテスト (ST)',
  acceptance: '受入テスト (UAT)',
};

export class BalanceAnalyzer {
  /**
   * Analyzes stratum density for each of the 5 phases across all requirements.
   */
  public analyzeStrata(
    requirements: RequirementSufficiency[],
    totalRequirements: number
  ): StratumReport[] {
    const levels: TestLevel[] = [
      'unit',
      'integration_internal',
      'integration_external',
      'system',
      'acceptance',
    ];

    if (totalRequirements === 0) {
      return levels.map(level => ({
        level,
        label: PHASE_LABELS[level],
        count: 0,
        coverageRatio: 0,
        density: 'missing',
      }));
    }

    return levels.map(level => {
      let coveredCount = 0;
      let totalTests = 0;

      for (const req of requirements) {
        const count = req.phaseCounts[level] || 0;
        if (count > 0) {
          coveredCount++;
          totalTests += count;
        }
      }

      const coverageRatio = Math.round((coveredCount / totalRequirements) * 100) / 100;
      let density: StratumDensity = 'missing';

      if (coverageRatio >= 0.8) {
        density = 'heavy';
      } else if (coverageRatio >= 0.5) {
        density = 'adequate';
      } else if (coverageRatio > 0) {
        density = 'thin';
      } else {
        density = 'missing';
      }

      return {
        level,
        label: PHASE_LABELS[level],
        count: totalTests,
        coverageRatio,
        density,
      };
    });
  }

  /**
   * Diagnoses pyramid distribution directly from PhaseCount numbers.
   */
  public static diagnoseFromCounts(counts: PhaseCount): {
    status: PyramidHealth;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let status: PyramidHealth = 'healthy';

    const unit = counts.unit || 0;
    const itInternal = counts.integration_internal || 0;
    const itExternal = counts.integration_external || 0;
    const system = counts.system || 0;
    const uat = counts.acceptance || 0;

    const totalIntegration = itInternal + itExternal;
    const totalTopLevel = system + uat;

    // 1. Inverted Ice-Cream Cone
    if (unit < totalTopLevel && totalTopLevel > 3 && unit < 5) {
      status = 'inverted_ice_cream';
      warnings.push(
        `逆ピラミッド（アイスクリームコーン型）が検知されました: 単体テスト (${unit}件) に対し、システム・受入テスト (${totalTopLevel}件) が過多です。`
      );
      suggestions.push(
        'E2E/受入テストに偏重するとCI実行時間の悪化やフレーキーテストの原因になります。下流の仕様・関数レベルの単体テストを拡充してください。'
      );
    }

    // 2. Hollow Hourglass
    if (unit > 0 && totalTopLevel > 0 && totalIntegration === 0) {
      if (status === 'healthy') status = 'hollow_hourglass';
      warnings.push(
        `中間空洞化（ひょうたん型）が検知されました: 単体テストと総合/受入テストが存在しますが、中間の結合テスト (ITa / ITb) が 0 件です。`
      );
      suggestions.push(
        'モジュール間連携や外部IF、DBアクセスなどのサブシステム境界を検証する内部結合・外部結合テストを追加してください。'
      );
    }

    if (warnings.length === 0) {
      suggestions.push('テストピラミッドのバランスは良好です。全工程で適切なテスト密度が維持されています。');
    }

    return { status, warnings, suggestions };
  }

  /**
   * Diagnoses Test Pyramid shape health and detects anti-patterns.
   */
  public diagnosePyramid(
    graph: TraceGraph,
    strata: StratumReport[],
    requirements: RequirementSufficiency[]
  ): PyramidHealthReport {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let status: PyramidHealth = 'healthy';

    const countByLevel = new Map<TestLevel, number>();
    for (const s of strata) {
      countByLevel.set(s.level, s.count);
    }

    const unit = countByLevel.get('unit') || 0;
    const itInternal = countByLevel.get('integration_internal') || 0;
    const itExternal = countByLevel.get('integration_external') || 0;
    const system = countByLevel.get('system') || 0;
    const uat = countByLevel.get('acceptance') || 0;

    const totalIntegration = itInternal + itExternal;
    const totalTopLevel = system + uat;

    // 1. Inverted Ice-Cream Cone (逆ピラミッド): Heavy top-level, light bottom
    if (unit < totalTopLevel && totalTopLevel > 3 && unit < 5) {
      status = 'inverted_ice_cream';
      warnings.push(
        `逆ピラミッド（アイスクリームコーン型）が検知されました: 単体テスト (${unit}件) に対し、システム・受入テスト (${totalTopLevel}件) が過多です。`
      );
      suggestions.push(
        'E2E/受入テストに偏重するとCI実行時間の悪化やフレーキーテストの原因になります。下流の仕様・関数レベルの単体テストを拡充してください。'
      );
    }

    // 2. Hollow Hourglass (中間空洞化・ひょうたん型): Unit and Top exist, but Integration missing
    if (unit > 0 && totalTopLevel > 0 && totalIntegration === 0) {
      if (status === 'healthy') status = 'hollow_hourglass';
      warnings.push(
        `中間空洞化（ひょうたん型）が検知されました: 単体テストと総合/受入テストが存在しますが、中間の結合テスト (ITa / ITb) が 0 件です。`
      );
      suggestions.push(
        'モジュール間連携や外部IF、DBアクセスなどのサブシステム境界を検証する内部結合・外部結合テストを追加してください。'
      );
    }

    // 3. Untested Specifications: Check specs with 0 test cases
    const specs = graph.getSpecifications();
    const untestedSpecs: string[] = [];
    for (const spec of specs) {
      const tcs = graph.getDirectTestCases(spec.id);
      if (tcs.length === 0) {
        untestedSpecs.push(spec.id);
      }
    }

    if (untestedSpecs.length > 0) {
      if (status === 'healthy' && untestedSpecs.length > specs.length * 0.4) {
        status = 'missing_specs';
      }
      warnings.push(
        `テスト未紐付けの詳細仕様 (SPEC) が ${untestedSpecs.length} 件存在します: [${untestedSpecs.slice(0, 5).join(', ')}${untestedSpecs.length > 5 ? '...' : ''}]`
      );
      suggestions.push(
        '詳細仕様（異常系・制約条件）を直接検証するテストケース（単体または結合）を作成して verifies に紐づけてください。'
      );
    }

    // Untested high criticality requirements
    const untestedHigh = requirements.filter(r => r.criticality === 'high' && r.score < 50);
    if (untestedHigh.length > 0) {
      warnings.push(
        `重要度 High の要件で充足度が低い要件が ${untestedHigh.length} 件あります: [${untestedHigh.map(r => r.requirementId).join(', ')}]`
      );
      suggestions.push(
        '重要要件については、単体テストだけでなく内部結合・外部結合のテストケースを優先して拡充してください。'
      );
    }

    if (warnings.length === 0) {
      suggestions.push('テストピラミッドのバランスは良好です。全工程で適切なテスト密度が維持されています。');
    }

    return {
      status,
      warnings,
      suggestions,
    };
  }
}
