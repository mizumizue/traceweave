import {
  TestCaseExecutionReport,
  TestResultsReport,
  TestExecutionStatus,
} from '../models/types.js';
import { TestResultsMergeStrategy } from './types.js';

function summarize(results: Record<string, TestCaseExecutionReport>): {
  passedCount: number;
  failedCount: number;
  skippedCount: number;
} {
  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  for (const entry of Object.values(results)) {
    if (entry.status === 'passed') passedCount += 1;
    else if (entry.status === 'failed') failedCount += 1;
    else skippedCount += 1;
  }
  return { passedCount, failedCount, skippedCount };
}

const STATUS_RANK: Record<TestExecutionStatus, number> = {
  failed: 3,
  passed: 2,
  skipped: 1,
  pending: 0,
};

function pickEntry(
  existing: TestCaseExecutionReport,
  incoming: TestCaseExecutionReport,
  strategy: TestResultsMergeStrategy
): TestCaseExecutionReport {
  if (strategy === 'last-wins') return incoming;
  const existingRank = STATUS_RANK[existing.status] ?? 0;
  const incomingRank = STATUS_RANK[incoming.status] ?? 0;
  return incomingRank >= existingRank ? incoming : existing;
}

export function mergeTestResultsReports(
  reports: TestResultsReport[],
  strategy: TestResultsMergeStrategy = 'fail-wins'
): TestResultsReport {
  const results: Record<string, TestCaseExecutionReport> = {};
  let generatedAt = new Date(0).toISOString();

  for (const report of reports) {
    if (!report?.results) continue;
    if (report.generatedAt && report.generatedAt > generatedAt) {
      generatedAt = report.generatedAt;
    }
    for (const [tcId, entry] of Object.entries(report.results)) {
      const prev = results[tcId];
      results[tcId] = prev ? pickEntry(prev, entry, strategy) : entry;
    }
  }

  if (generatedAt === new Date(0).toISOString()) {
    generatedAt = new Date().toISOString();
  }

  const { passedCount, failedCount, skippedCount } = summarize(results);
  return {
    generatedAt,
    totalTests: passedCount + failedCount + skippedCount,
    passedCount,
    failedCount,
    skippedCount,
    results,
  };
}
