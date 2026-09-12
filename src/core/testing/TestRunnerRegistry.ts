import { SufficiencyScorer } from '../sufficiency/SufficiencyScorer.js';
import { BalanceAnalyzer } from '../analyzer/BalanceAnalyzer.js';
import { TraceGraph } from '../graph/TraceGraph.js';
import {
  TestRunRequest,
  TestRunResult,
  TestCaseDataset,
  PhaseCount,
  Criticality,
  DocNode,
} from '../models/types.js';

export type TestHandler = (inputs: Record<string, any>) => { actual: any; logs: string[] };

export class TestRunnerRegistry {
  private static handlers = new Map<string, TestHandler>();

  static {
    // TC-0002 / TC-0010: Sufficiency scoring (Pure calculation logic with simple inputs & outputs)
    const sufficiencyHandler: TestHandler = inputs => {
      const logs: string[] = [];
      const criticality = (inputs.criticality || 'medium') as Criticality;
      const counts: PhaseCount = {
        unit: Number(inputs.phaseCounts?.unit ?? inputs.unit ?? 0),
        integration_internal: Number(inputs.phaseCounts?.integration_internal ?? inputs.integration_internal ?? 0),
        integration_external: Number(inputs.phaseCounts?.integration_external ?? inputs.integration_external ?? 0),
        system: Number(inputs.phaseCounts?.system ?? inputs.system ?? 0),
        acceptance: Number(inputs.phaseCounts?.acceptance ?? inputs.acceptance ?? 0),
      };

      logs.push(`計算条件: criticality=${criticality}`);
      logs.push(
        `工程分布: UT=${counts.unit}, ITa=${counts.integration_internal}, ITb=${counts.integration_external}, ST=${counts.system}, UAT=${counts.acceptance}`
      );

      const result = SufficiencyScorer.computeScore(criticality, counts);
      logs.push(`算出結果: score=${result.score}%, isFullySatisfied=${result.isFullySatisfied}`);
      if (result.missingPhases.length > 0) {
        logs.push(`不足工程: ${result.missingPhases.join(', ')}`);
      }

      return {
        actual: {
          score: result.score,
          isFullySatisfied: result.isFullySatisfied,
        },
        logs,
      };
    };
    this.register('TC-0002', sufficiencyHandler);
    this.register('TC-0010', sufficiencyHandler);

    // TC-0003 / TC-0011: Pyramid health diagnostics (Pure calculation logic with simple inputs & outputs)
    const pyramidHandler: TestHandler = inputs => {
      const logs: string[] = [];
      const counts: PhaseCount = {
        unit: Number(inputs.phaseCounts?.unit ?? inputs.unit ?? 0),
        integration_internal: Number(inputs.phaseCounts?.integration_internal ?? inputs.integration_internal ?? 0),
        integration_external: Number(inputs.phaseCounts?.integration_external ?? inputs.integration_external ?? 0),
        system: Number(inputs.phaseCounts?.system ?? inputs.system ?? 0),
        acceptance: Number(inputs.phaseCounts?.acceptance ?? inputs.acceptance ?? 0),
      };

      logs.push(
        `ピラミッド診断入力: UT=${counts.unit}, ITa=${counts.integration_internal}, ITb=${counts.integration_external}, ST=${counts.system}, UAT=${counts.acceptance}`
      );
      const result = BalanceAnalyzer.diagnoseFromCounts(counts);
      logs.push(`判定ステータス: ${result.status}`);
      for (const w of result.warnings) {
        logs.push(`[Warning] ${w}`);
      }
      for (const s of result.suggestions) {
        logs.push(`[Suggestion] ${s}`);
      }

      return {
        actual: {
          status: result.status,
          hasWarnings: result.warnings.length > 0,
        },
        logs,
      };
    };
    this.register('TC-0003', pyramidHandler);
    this.register('TC-0011', pyramidHandler);
  }

  public static register(testCaseId: string, handler: TestHandler): void {
    this.handlers.set(testCaseId, handler);
  }

  public static has(testCaseId: string): boolean {
    return this.handlers.has(testCaseId);
  }

  /**
   * Determines whether the specified testCaseId can be executed on the UI (pure I/O function).
   */
  public static isExecutable(testCaseId: string): boolean {
    return this.handlers.has(testCaseId);
  }

  /**
   * Returns list of test case IDs executable on the UI.
   */
  public static getExecutableTestCaseIds(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Executes a registered test case logic with custom inputs and optional expected comparison.
   * If the test case is not registered (i.e. cannot be run with simple I/O), returns an error result.
   */
  public static runTest(request: TestRunRequest): TestRunResult {
    const start = performance.now();
    const handler = this.handlers.get(request.testCaseId);

    let actual: any;
    let logs: string[] = [];

    if (!handler) {
      const durationMs = Math.round((performance.now() - start) * 10) / 10;
      return {
        testCaseId: request.testCaseId,
        status: 'error',
        actual: null,
        expected: request.expected,
        isMatch: false,
        durationMs,
        logs: [
          `[UI実行除外] テストケース "${request.testCaseId}" はファイルシステムや外部環境に依存するため、UI上からの実行対象外です。`,
        ],
        error: `テストケース "${request.testCaseId}" はUI実行に対応していません（単純な入出力のみで実行できないテストのため除外）。`,
        executedAt: new Date().toISOString(),
      };
    } else {
      try {
        const res = handler(request.inputs);
        actual = res.actual;
        logs = res.logs;
      } catch (err: any) {
        const durationMs = Math.round((performance.now() - start) * 10) / 10;
        return {
          testCaseId: request.testCaseId,
          status: 'error',
          actual: null,
          expected: request.expected,
          isMatch: false,
          durationMs,
          logs: [`実行エラー: ${err.message}`],
          error: err.message,
          executedAt: new Date().toISOString(),
        };
      }
    }

    const durationMs = Math.round((performance.now() - start) * 10) / 10;

    let isMatch = true;
    let status: 'passed' | 'failed' | 'error' = 'passed';
    const diffs: string[] = [];

    if (request.expected !== undefined && request.expected !== null) {
      isMatch = this.checkEquality(actual, request.expected, '', diffs);
      status = isMatch ? 'passed' : 'failed';

      if (isMatch) {
        logs.push(`期待値一致検証: PASSED (実測値と期待値が完全一致しました)`);
      } else {
        logs.push(`期待値一致検証: FAILED (期待値と実測値に不一致があります)`);
        for (const diff of diffs) {
          logs.push(`  ✖ 差分: ${diff}`);
        }
      }
    } else {
      logs.push(`期待値未指定: 実行完了 (PASSED)`);
    }

    return {
      testCaseId: request.testCaseId,
      status,
      actual,
      expected: request.expected,
      isMatch,
      durationMs,
      logs,
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Batch runs all patterns in a TestCaseDataset.
   */
  public static runDataset(dataset: TestCaseDataset): {
    datasetId: string;
    total: number;
    passed: number;
    failed: number;
    results: TestRunResult[];
  } {
    const results: TestRunResult[] = [];
    let passed = 0;
    let failed = 0;

    for (const pattern of dataset.patterns) {
      const result = this.runTest({
        testCaseId: dataset.testCaseId,
        inputs: pattern.inputs,
        expected: pattern.expected,
      });
      results.push(result);
      if (result.status === 'passed') {
        passed++;
      } else {
        failed++;
      }
    }

    return {
      datasetId: dataset.testCaseId,
      total: dataset.patterns.length,
      passed,
      failed,
      results,
    };
  }

  /**
   * Deep equality checking that accurately catches mismatches in primitives, arrays, and objects.
   */
  public static checkEquality(actual: any, expected: any, path = '', diffs: string[] = []): boolean {
    if (actual === expected) return true;

    const label = path || 'root';

    if (actual === null || actual === undefined || expected === null || expected === undefined) {
      diffs.push(`${label}: 期待値=${JSON.stringify(expected)} に対し 実測値=${JSON.stringify(actual)}`);
      return false;
    }

    if (typeof expected !== typeof actual) {
      diffs.push(`${label}: 型不一致 期待値型(${typeof expected}) !== 実測値型(${typeof actual})`);
      return false;
    }

    if (typeof expected !== 'object') {
      if (actual !== expected) {
        diffs.push(`${label}: 期待値=${JSON.stringify(expected)} に対し 実測値=${JSON.stringify(actual)}`);
        return false;
      }
      return true;
    }

    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        diffs.push(`${label}: 期待値は配列ですが実測値は非配列です`);
        return false;
      }
      if (actual.length !== expected.length) {
        diffs.push(`${label}: 配列長不一致 期待値長=${expected.length} に対し 実測値長=${actual.length}`);
        return false;
      }
      let match = true;
      for (let i = 0; i < expected.length; i++) {
        if (!this.checkEquality(actual[i], expected[i], `${path}[${i}]`, diffs)) {
          match = false;
        }
      }
      return match;
    }

    // Object comparison: check that all expected properties match in actual
    let match = true;
    for (const key of Object.keys(expected)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in actual)) {
        diffs.push(`${currentPath}: 実測値に対象キー "${key}" が存在しません`);
        match = false;
      } else if (!this.checkEquality(actual[key], expected[key], currentPath, diffs)) {
        match = false;
      }
    }

    return match;
  }
}
