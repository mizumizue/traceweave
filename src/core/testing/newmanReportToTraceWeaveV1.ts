import type { TestCaseExecutionReport, TestResultsReport } from '../models/types.js';

const TC_ID_PATTERN = /TC-\d{4}/;

export interface NewmanReportLike {
  run?: {
    timings?: { started?: number; completed?: number };
    executions?: NewmanExecutionLike[];
  };
}

export interface NewmanExecutionLike {
  item?: { name?: string };
  assertions?: { error?: { message?: string } | null }[];
  response?: { code?: number };
  timings?: { response?: number };
}

function extractTcId(itemName: string): string | null {
  const match = itemName.match(TC_ID_PATTERN);
  return match ? match[0] : null;
}

function executionFailed(execution: NewmanExecutionLike): boolean {
  const assertions = execution.assertions ?? [];
  if (assertions.some(a => a.error != null)) return true;
  const code = execution.response?.code;
  if (code != null && (code < 200 || code >= 300)) {
    // Non-2xx without explicit assertion failure still counts as failed for capture.
    const hasStatusAssertion = assertions.length > 0;
    if (!hasStatusAssertion) return true;
  }
  return false;
}

/**
 * Converts a Newman JSON export into traceweave-v1 (one aggregate row per TC ID).
 */
export function newmanReportToTraceWeaveV1(
  newmanReport: NewmanReportLike,
  executedAt: string = new Date().toISOString()
): TestResultsReport {
  const executions = newmanReport.run?.executions ?? [];
  const byTc = new Map<string, { failed: boolean; titles: string[]; durationMs: number; errors: string[] }>();

  for (const execution of executions) {
    const name = execution.item?.name ?? '';
    const tcId = extractTcId(name);
    if (!tcId) continue;

    const failed = executionFailed(execution);
    const durationMs = Math.round(execution.timings?.response ?? 0);
    const errors = (execution.assertions ?? [])
      .filter(a => a.error != null)
      .map(a => a.error?.message ?? 'assertion failed');

    const existing = byTc.get(tcId);
    if (!existing) {
      byTc.set(tcId, { failed, titles: [name], durationMs, errors });
    } else {
      existing.failed = existing.failed || failed;
      existing.titles.push(name);
      existing.durationMs += durationMs;
      existing.errors.push(...errors);
    }
  }

  const results: Record<string, TestCaseExecutionReport> = {};
  let passedCount = 0;
  let failedCount = 0;

  for (const [testCaseId, agg] of byTc) {
    const status = agg.failed ? 'failed' : 'passed';
    if (status === 'passed') passedCount += 1;
    else failedCount += 1;

    results[testCaseId] = {
      testCaseId,
      status,
      durationMs: agg.durationMs,
      testTitle: agg.titles[0] ?? testCaseId,
      executedAt,
      ...(agg.errors.length > 0 ? { errorMessage: agg.errors.join('; ') } : {}),
    };
  }

  const totalTests = passedCount + failedCount;
  return {
    generatedAt: executedAt,
    totalTests,
    passedCount,
    failedCount,
    skippedCount: 0,
    results,
  };
}
