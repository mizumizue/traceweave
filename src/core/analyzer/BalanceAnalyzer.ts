import { TraceGraph } from '../graph/TraceGraph.js';
import { emptyPhaseCounts, isTraceabilityTestCase } from '../sufficiency/SufficiencyScorer.js';
import {
  DocNode,
  PyramidHealth,
  PyramidHealthReport,
  RequirementSufficiency,
  StratumDensity,
  StratumReport,
  TestLevel,
  PhaseCount,
  UnitCoverageReport,
} from '../models/types.js';
import { TEST_LEVEL_LABELS, TEST_STRATUM_ORDER } from '../testing/testLevelLabels.js';

const PHASE_LABELS = TEST_LEVEL_LABELS;

function isPassed(tc: DocNode): boolean {
  return tc.execution_status === 'passed';
}

export class BalanceAnalyzer {
  private static tallyTraceabilityPhases(testCases: DocNode[]): PhaseCount {
    const counts = emptyPhaseCounts();
    for (const tc of testCases) {
      if (!isTraceabilityTestCase(tc) || !isPassed(tc) || !tc.test_level) continue;
      if (tc.test_level in counts) {
        counts[tc.test_level]++;
      }
    }
    return counts;
  }

  private resolveExecutedPhaseCounts(
    req: RequirementSufficiency,
    graph?: TraceGraph
  ): PhaseCount {
    if (!graph) {
      return req.phaseCounts;
    }

    const node = graph.getNode(req.requirementId);
    if (!node) {
      return req.phaseCounts;
    }

    const testCases =
      node.kind === 'specification'
        ? graph.getDirectTestCases(req.requirementId)
        : graph.getAllTestCasesForRequirement(req.requirementId);

    return BalanceAnalyzer.tallyTraceabilityPhases(testCases);
  }

  /**
   * Analyzes stratum density for each of the 5 phases across all requirements.
   * Phase counts include only test cases with execution_status === 'passed'.
   */
  public analyzeStrata(
    requirements: RequirementSufficiency[],
    totalRequirements: number,
    graph?: TraceGraph,
    unitCoverage?: UnitCoverageReport
  ): StratumReport[] {
    const levels: TestLevel[] = [...TEST_STRATUM_ORDER];

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
      if (level === 'unit') {
        if (unitCoverage?.status === 'available') {
          return {
            level,
            label: PHASE_LABELS[level],
            count: unitCoverage.testedFunctions,
            coverageRatio: unitCoverage.functionCoverage,
            branchCoverage: unitCoverage.branchCoverage,
            density: unitCoverage.density,
            metricSource: 'code_coverage',
          };
        }
        return {
          level,
          label: PHASE_LABELS[level],
          count: 0,
          coverageRatio: 0,
          density: 'missing',
          metricSource: 'code_coverage',
        };
      }

      let coveredCount = 0;
      let totalTests = 0;

      for (const req of requirements) {
        const phaseCounts = this.resolveExecutedPhaseCounts(req, graph);
        const count = phaseCounts[level] || 0;
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
        metricSource: 'traceability',
      };
    });
  }

  /**
   * Internal evaluator for test distribution across 5 phases.
   */
  private static evaluateDistribution(
    counts: PhaseCount,
    options?: { documentedTestCount?: number }
  ): {
    status: PyramidHealth;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const unit = counts.unit || 0;
    const itInternal = counts.integration_internal || 0;
    const itExternal = counts.integration_external || 0;
    const system = counts.system || 0;
    const uat = counts.acceptance || 0;

    const totalIntegration = itInternal + itExternal;
    const totalTopLevel = system + uat;
    const totalTests = unit + totalIntegration + totalTopLevel;
    const documentedTestCount = options?.documentedTestCount ?? 0;

    if (totalTests === 0) {
      if (documentedTestCount > 0) {
        return {
          status: 'unbalanced',
          warnings: [
            `テストケース文書は ${documentedTestCount} 件存在しますが、実行に合格したテストケースが 1 件もありません。`,
          ],
          suggestions: [
            'テストを実行し、実行レポートを結合してください。文書の作成だけでは地層密度・ピラミッド診断に加算されません。',
          ],
        };
      }

      return {
        status: 'unbalanced',
        warnings: ['実行に合格したテストケースが 1 件もありません。'],
        suggestions: [
          'テストケースを作成し実行レポートを結合してください。文書の作成だけでは地層密度・ピラミッド診断に加算されません。',
        ],
      };
    }

    const unitRatio = unit / totalTests;
    const integrationRatio = totalIntegration / totalTests;

    // 1. Inverted Ice-Cream Cone (逆ピラミッド): Heavy top-level, light bottom
    if (totalTopLevel > unit && totalTopLevel >= 3 && unit < 5) {
      return {
        status: 'inverted_ice_cream',
        warnings: [
          `逆ピラミッド（アイスクリームコーン型）が検知されました: 単体テスト (${unit}件) に対し、システム・受入テスト (${totalTopLevel}件) が過多です。`,
        ],
        suggestions: [
          'E2E/受入テストに偏重するとCI実行時間の悪化やフレーキーテストの原因になります。下流の仕様・関数レベルの単体テストを拡充してください。',
        ],
      };
    }

    // 2. Hollow Hourglass (中間空洞化・ひょうたん型): Unit and Top exist, but Integration missing
    if (unit > 0 && totalTopLevel > 0 && totalIntegration === 0) {
      return {
        status: 'hollow_hourglass',
        warnings: [
          '中間空洞化（ひょうたん型）が検知されました: 単体テストと総合/受入テストが存在しますが、中間の結合テスト (ITa / ITb) が 0 件です。',
        ],
        suggestions: [
          'モジュール間連携や外部IF、DBアクセスなどのサブシステム境界を検証する内部結合・外部結合テストを追加してください。',
        ],
      };
    }

    // 3. Unbalanced / Missing Layers: 欠落工程があるか、または一部工程が極端に偏重
    const missingPhases: string[] = [];
    if (unit === 0) missingPhases.push('単体テスト (UT)');
    if (itInternal === 0 && itExternal === 0) missingPhases.push('結合テスト (ITa/ITb)');
    if (system === 0) missingPhases.push('システムテスト (ST)');
    if (uat === 0) missingPhases.push('受入テスト (UAT)');

    // テスト件数がある程度あり、特定工程が欠落している場合は不均衡と判定
    if (totalTests >= 10 && missingPhases.length > 0) {
      if (missingPhases.includes('システムテスト (ST)')) {
        warnings.push('システムテスト (ST) が 0 件です。システム全体の統合シナリオ検証が欠落しています。');
      }
      if (totalIntegration > unit * 2 && integrationRatio >= 0.5) {
        warnings.push(
          `結合テスト (${totalIntegration}件, ${Math.round(integrationRatio * 100)}%) に偏重しており、単体テスト (${unit}件, ${Math.round(unitRatio * 100)}%) が僅少です。`
        );
      }
      for (const phase of missingPhases) {
        if (phase !== 'システムテスト (ST)') {
          warnings.push(`未実施のテスト工程が存在します: [${phase}]`);
        }
      }

      suggestions.push(
        '欠落している工程のテストケースを拡充し、単体テストで検証可能な純粋ロジックは単体層へ移行してフィードバック速度を向上させてください。'
      );

      return {
        status: 'unbalanced',
        warnings,
        suggestions,
      };
    }

    // 4. Healthy Trophy (テストトロフィー型): 結合テストが最多で各層がバランスよく配置
    if (
      totalIntegration >= unit &&
      totalIntegration >= totalTopLevel &&
      integrationRatio >= 0.35 &&
      unitRatio >= 0.1 &&
      missingPhases.length === 0
    ) {
      suggestions.push(
        '結合テストを中心とする「テストトロフィー型」の良好なバランスを維持しています。モジュール連携とインターフェース契約が手厚く保証されています。'
      );
      return {
        status: 'healthy_trophy',
        warnings,
        suggestions,
      };
    }

    // 5. Classic Healthy Pyramid: 単体テストが最多で上位層に向かって絞り込まれる
    if (unit >= totalIntegration && totalIntegration >= totalTopLevel && unitRatio >= 0.4) {
      suggestions.push('単体テストを土台とし、上位工程に進むほど絞り込まれる理想的なピラミッド分布を維持しています。');
      return {
        status: 'healthy',
        warnings,
        suggestions,
      };
    }

    // 6. それ以外の不均衡
    if (unit < totalIntegration) {
      warnings.push(`単体テスト (${unit}件) より結合テスト (${totalIntegration}件) が多く、不均衡な傾向があります。`);
      suggestions.push('単体テストの拡充または結合テストの責務見直しを行ってください。');
      return {
        status: 'unbalanced',
        warnings,
        suggestions,
      };
    }

    suggestions.push('テスト構成のバランスは概ね良好です。');
    return {
      status: 'healthy',
      warnings,
      suggestions,
    };
  }

  /**
   * Diagnoses pyramid distribution directly from PhaseCount numbers.
   */
  public static diagnoseFromCounts(counts: PhaseCount): {
    status: PyramidHealth;
    warnings: string[];
    suggestions: string[];
  } {
    return BalanceAnalyzer.evaluateDistribution(counts);
  }

  /**
   * Diagnoses Test Pyramid shape health and detects anti-patterns.
   */
  public diagnosePyramid(
    graph: TraceGraph,
    strata: StratumReport[],
    requirements: RequirementSufficiency[]
  ): PyramidHealthReport {
    const testCases = graph.getTestCases();
    const countByLevel = new Map<TestLevel, number>();
    for (const s of strata) {
      countByLevel.set(s.level, s.count);
    }

    const countsFromStrata: PhaseCount = {
      unit: countByLevel.get('unit') || 0,
      integration_internal: countByLevel.get('integration_internal') || 0,
      integration_external: countByLevel.get('integration_external') || 0,
      system: countByLevel.get('system') || 0,
      acceptance: countByLevel.get('acceptance') || 0,
    };

    const traceabilityTestCases = testCases.filter(isTraceabilityTestCase);
    const evaluated = BalanceAnalyzer.evaluateDistribution(countsFromStrata, {
      documentedTestCount: traceabilityTestCases.length,
    });
    let status: PyramidHealth = evaluated.status;
    const warnings: string[] = [...evaluated.warnings];
    const suggestions: string[] = [...evaluated.suggestions];

    // 3. Untested Specifications: specs with no passed test cases
    const specs = graph.getSpecifications();
    const specsWithoutLinkedTc: string[] = [];
    const specsWithoutPassedTc: string[] = [];
    for (const spec of specs) {
      const linkedTcs = graph.getDirectTestCases(spec.id).filter(isTraceabilityTestCase);
      const passedTcs = linkedTcs.filter(isPassed);
      if (passedTcs.length > 0) {
        continue;
      }
      if (linkedTcs.length === 0) {
        specsWithoutLinkedTc.push(spec.id);
      } else {
        specsWithoutPassedTc.push(spec.id);
      }
    }

    const untestedSpecs = [...specsWithoutLinkedTc, ...specsWithoutPassedTc];
    if (untestedSpecs.length > 0) {
      if (['healthy', 'healthy_trophy'].includes(status) && untestedSpecs.length > specs.length * 0.4) {
        status = 'missing_specs';
      }
      if (specsWithoutLinkedTc.length > 0) {
        warnings.push(
          `テストケース文書が未紐付けの詳細仕様 (SPEC) が ${specsWithoutLinkedTc.length} 件存在します: [${specsWithoutLinkedTc.slice(0, 5).join(', ')}${specsWithoutLinkedTc.length > 5 ? '...' : ''}]`
        );
      }
      if (specsWithoutPassedTc.length > 0) {
        warnings.push(
          `実行合格のテストケースがない詳細仕様 (SPEC) が ${specsWithoutPassedTc.length} 件存在します（文書のみ・未実行または失敗）: [${specsWithoutPassedTc.slice(0, 5).join(', ')}${specsWithoutPassedTc.length > 5 ? '...' : ''}]`
        );
      }
      suggestions.push(
        '詳細仕様（異常系・制約条件）を直接検証するテストケース（単体または結合）を作成して verifies に紐づけ、実行レポートを結合してください。'
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

    if (warnings.length === 0 && suggestions.length === 0) {
      suggestions.push('テスト構成のバランスは良好です。全工程で適切なテスト密度が維持されています。');
    }

    return {
      status,
      warnings,
      suggestions,
    };
  }
}
