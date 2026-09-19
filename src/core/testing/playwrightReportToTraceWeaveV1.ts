import type { TestCaseExecutionReport, TestResultsReport } from '../models/types.js';
import { formalTestCaseIdFromTitle } from './testCaseId.js';

export interface PlaywrightJsonReportLike {
  suites?: PlaywrightJsonSuiteLike[];
}

export interface PlaywrightJsonSuiteLike {
  title?: string;
  specs?: PlaywrightJsonSpecLike[];
  suites?: PlaywrightJsonSuiteLike[];
}

export interface PlaywrightJsonSpecLike {
  title?: string;
  tests?: PlaywrightJsonTestLike[];
}

export interface PlaywrightJsonTestLike {
  results?: PlaywrightJsonResultLike[];
}

export interface PlaywrightJsonResultLike {
  status?: string;
  duration?: number;
  error?: { message?: string };
}

function walkSpecs(
  suites: PlaywrightJsonSuiteLike[] | undefined,
  prefix: string,
  sink: (fullTitle: string, result: PlaywrightJsonResultLike) => void
): void {
  for (const suite of suites ?? []) {
    const suiteTitle = suite.title?.trim();
    const nextPrefix = suiteTitle ? (prefix ? `${prefix} › ${suiteTitle}` : suiteTitle) : prefix;
    for (const spec of suite.specs ?? []) {
      const specTitle = spec.title?.trim() ?? '';
      const fullTitle = nextPrefix ? `${nextPrefix} › ${specTitle}` : specTitle;
      for (const test of spec.tests ?? []) {
        const result = test.results?.[test.results.length - 1];
        if (result) sink(fullTitle, result);
      }
    }
    walkSpecs(suite.suites, nextPrefix, sink);
  }
}

/**
 * Converts Playwright JSON reporter output into traceweave-v1 (title-prefix TC ids only).
 */
export function playwrightReportToTraceWeaveV1(
  report: PlaywrightJsonReportLike,
  executedAt: string = new Date().toISOString()
): TestResultsReport {
  const byTc = new Map<
    string,
    { failed: boolean; titles: string[]; durationMs: number; errors: string[] }
  >();

  walkSpecs(report.suites, '', (fullTitle, result) => {
    const leafTitle = fullTitle.split(' › ').pop()?.trim() ?? fullTitle;
    const tcId = formalTestCaseIdFromTitle(leafTitle);
    if (!tcId) return;

    const status = result.status ?? 'failed';
    const failed = status !== 'passed' && status !== 'skipped';
    const durationMs = Math.round(result.duration ?? 0);
    const errMsg = result.error?.message;

    const existing = byTc.get(tcId);
    if (!existing) {
      byTc.set(tcId, {
        failed,
        titles: [leafTitle],
        durationMs,
        errors: errMsg ? [errMsg] : [],
      });
    } else {
      existing.failed = existing.failed || failed;
      existing.titles.push(leafTitle);
      existing.durationMs += durationMs;
      if (errMsg) existing.errors.push(errMsg);
    }
  });

  const results: Record<string, TestCaseExecutionReport> = {};
  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

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

  const totalTests = passedCount + failedCount + skippedCount;
  return {
    generatedAt: executedAt,
    totalTests,
    passedCount,
    failedCount,
    skippedCount,
    results,
  };
}
