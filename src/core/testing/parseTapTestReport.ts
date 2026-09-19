import { TestCaseExecutionReport, TestExecutionStatus } from '../models/types.js';

export function parseTapReportToResults(
  tapContent: string,
  executedAt: string
): {
  results: Record<string, TestCaseExecutionReport>;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
} {
  const results: Record<string, TestCaseExecutionReport> = {};
  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  const blocks = tapContent.split(/^# Subtest:/m).slice(1);
  for (const block of blocks) {
    const title = block.split('\n')[0]?.trim() ?? '';
    const resultLine = block.match(/^(?:ok|not ok) \d+ - (.*)$/m);
    if (!resultLine) continue;

    const line = resultLine[0];
    const fullTitle = resultLine[1].trim();
    const isOk = line.startsWith('ok ');
    const isSkipped = line.includes('# SKIP') || line.includes('# TODO');
    const status: TestExecutionStatus = isSkipped ? 'skipped' : isOk ? 'passed' : 'failed';

    const durMatch = block.match(/duration_ms:\s*([\d.]+)/);
    const durationMs = durMatch ? parseFloat(durMatch[1]) : 0;
    const errMatch = block.match(/error:\s*'?([^'\n]+)'?/);
    const errorMessage = isOk ? undefined : errMatch?.[1] ?? 'Test assertion failed';

    const tcMatches = [...fullTitle.matchAll(/TC-(?:UT|ITa|ITb|ST|UAT)-\d{4}/g)].map(m => m[0]);
    if (tcMatches.length === 0) continue;

    if (status === 'passed') passedCount += tcMatches.length;
    else if (status === 'failed') failedCount += tcMatches.length;
    else skippedCount += tcMatches.length;

    for (const tcId of tcMatches) {
      results[tcId] = {
        testCaseId: tcId,
        status,
        durationMs,
        testTitle: fullTitle || title,
        errorMessage,
        outputLog: `# Subtest: ${title}\n${block.trim()}`,
        executedAt,
      };
    }
  }

  return { results, passedCount, failedCount, skippedCount };
}

export function testResultsFromTap(
  tapContent: string,
  executedAt: string
): import('../models/types.js').TestResultsReport {
  const { results, passedCount, failedCount, skippedCount } = parseTapReportToResults(
    tapContent,
    executedAt
  );
  return {
    generatedAt: executedAt,
    totalTests: passedCount + failedCount + skippedCount,
    passedCount,
    failedCount,
    skippedCount,
    results,
  };
}
