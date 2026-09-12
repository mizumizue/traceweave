import { buildTraceWeaveReport } from './build-report.js';
import { TraceWeaveReport } from '../core/models/types.js';

export interface CheckOptions {
  docsDir?: string;
  strict?: boolean;
}

export interface CheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  report?: TraceWeaveReport;
}

const VALID_TEST_LEVELS = [
  'unit',
  'integration_internal',
  'integration_external',
  'system',
  'acceptance',
];

const VALID_TEST_METHODS = [
  'unit_mock',
  'unit_contract',
  'property_based',
  'api_contract',
  'scenario',
  'e2e',
  'performance_load',
  'security',
  'exploratory_manual',
];

export function checkDocs(options: CheckOptions = {}): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const { report, graph, nodes } = buildTraceWeaveReport({
      docsDir: options.docsDir,
      useCache: false,
    });

    // 1. Basic node validation
    for (const node of nodes) {
      if (node.kind === 'test_case') {
        if (!node.test_level || !VALID_TEST_LEVELS.includes(node.test_level)) {
          errors.push(`[${node.id}] test_level "${node.test_level}" is invalid`);
        }
        if (!node.test_method || !VALID_TEST_METHODS.includes(node.test_method)) {
          errors.push(`[${node.id}] test_method "${node.test_method}" is invalid`);
        }
        if (!node.verifies || node.verifies.length === 0) {
          errors.push(`[${node.id}] test_case verifies must be non-empty`);
        }
      }
    }

    // 2. Cycles & Missing References
    const cycles = graph.detectCycles();
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        errors.push(`循環参照が検知されました: ${cycle.join(' -> ')} -> ${cycle[0]}`);
      }
    }

    const missingRefs = graph.detectMissingReferences();
    if (missingRefs.length > 0) {
      for (const m of missingRefs) {
        errors.push(`リンク切れ: [${m.fromId}] の ${m.type} で参照されている "${m.missingId}" が存在しません`);
      }
    }

    const orphans = graph.detectOrphans();
    for (const orphan of orphans) {
      warnings.push(`孤立文書: [${orphan.id}] (${orphan.title}) はどこにも接続されていません`);
    }

    // 3. Strict sufficiency checks
    if (options.strict) {
      if (report.gaps.untestedRequirements.length > 0) {
        errors.push(
          `[Strict] 未テスト要件が存在します (${report.gaps.untestedRequirements.length}件): ${report.gaps.untestedRequirements.join(', ')}`
        );
      }

      const highUntested = report.requirements.filter(r => r.criticality === 'high' && !r.isFullySatisfied);
      if (highUntested.length > 0) {
        errors.push(
          `[Strict] 重要度 High で未充足の要件が存在します: ${highUntested.map(r => `${r.requirementId}(${r.score}%)`).join(', ')}`
        );
      }
    } else {
      if (report.gaps.untestedRequirements.length > 0) {
        warnings.push(
          `未テスト要件が存在します (${report.gaps.untestedRequirements.length}件): ${report.gaps.untestedRequirements.join(', ')}`
        );
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      report,
    };
  } catch (err: any) {
    errors.push(`解析時エラー: ${err.message}`);
    return {
      passed: false,
      errors,
      warnings,
    };
  }
}
