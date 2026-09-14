import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseTestCaseFilter,
  resolveTestFilesForCase,
  testNamePatternForCase,
} from '../src/core/testing/formatTestRunCommand.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const REPORT_FILE = path.join(REPORTS_DIR, 'test-results.json');

interface TestCaseExecution {
  testCaseId: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  testTitle: string;
  errorMessage?: string;
  errorStack?: string;
  outputLog?: string;
  executedAt: string;
}

interface TestSuiteSummary {
  generatedAt: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  results: Record<string, TestCaseExecution>;
}

function parseTapReport(tapContent: string, executedAt: string): {
  results: Record<string, TestCaseExecution>;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
} {
  const results: Record<string, TestCaseExecution> = {};
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
    const status = isSkipped ? 'skipped' : isOk ? 'passed' : 'failed';

    const durMatch = block.match(/duration_ms:\s*([\d.]+)/);
    const durationMs = durMatch ? parseFloat(durMatch[1]) : 0;
    const errMatch = block.match(/error:\s*'?([^'\n]+)'?/);
    const errorMessage = isOk ? undefined : errMatch?.[1] ?? 'Test assertion failed';

    const tcMatches = [...fullTitle.matchAll(/TC-\d{4}/g)].map(m => m[0]);
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

function summarizeResults(results: Record<string, TestCaseExecution>): {
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

function loadExistingReport(): TestSuiteSummary | null {
  if (!fs.existsSync(REPORT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8')) as TestSuiteSummary;
  } catch {
    return null;
  }
}

function mergeReports(
  existing: TestSuiteSummary | null,
  partial: Pick<TestSuiteSummary, 'results' | 'generatedAt'>
): TestSuiteSummary {
  const results = { ...(existing?.results ?? {}), ...partial.results };
  const { passedCount, failedCount, skippedCount } = summarizeResults(results);

  return {
    generatedAt: partial.generatedAt,
    totalTests: passedCount + failedCount + skippedCount,
    passedCount,
    failedCount,
    skippedCount,
    results,
  };
}

async function ensureWebDistBuilt(): Promise<void> {
  const webDistIndex = path.join(ROOT, 'src', 'web', 'dist', 'index.html');
  if (process.env.TW_FORCE_WEB_BUILD === '1' || !fs.existsSync(webDistIndex)) {
    console.log('⚙ Building web dashboard (dist missing or TW_FORCE_WEB_BUILD=1)...');
    await new Promise<void>((resolve, reject) => {
      const child = spawn('npm', ['run', 'build:web', '--prefix', path.join(ROOT, 'src')], {
        cwd: ROOT,
        shell: true,
        stdio: 'inherit',
      });
      child.on('error', reject);
      child.on('exit', code => {
        if (code === 0) resolve();
        else reject(new Error(`build:web failed with exit code ${code}`));
      });
    });
  }
}

async function runTests(): Promise<void> {
  const testCaseFilter = parseTestCaseFilter(process.argv.slice(2));

  await ensureWebDistBuilt();

  const tsxCli = path.join(ROOT, 'src', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const testsDir = path.join(ROOT, 'tests');
  const testsPattern = path.join(testsDir, '**', '*.test.ts');
  const tapFile = path.join(os.tmpdir(), `traceweave-tap-${process.pid}.tap`);
  let testTargets: string[] = [testsPattern];

  if (testCaseFilter) {
    testTargets = resolveTestFilesForCase(testsDir, testCaseFilter);
    if (testTargets.length === 0) {
      console.error(
        `\x1b[31m✘ No automated test file declares ${testCaseFilter}. Add test('${testCaseFilter}: ...') in tests/.\x1b[0m`
      );
      process.exit(1);
    }
    console.log(`  ↳ ${testTargets.length} test file(s): ${testTargets.map(p => path.relative(ROOT, p)).join(', ')}`);
  }

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const executedAt = new Date().toISOString();
  if (testCaseFilter) {
    console.log(`🚀 Running filtered test suite for ${testCaseFilter}...`);
  } else {
    console.log('🚀 Running test suite with deterministic report capture...');
  }

  const nodeArgs = [
    tsxCli,
    '--test',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=tap',
    `--test-reporter-destination=${tapFile}`,
  ];
  if (testCaseFilter) {
    nodeArgs.push(`--test-name-pattern=${testNamePatternForCase(testCaseFilter)}`);
  }
  nodeArgs.push(...testTargets);

  const child = spawn(
    process.execPath,
    nodeArgs,
    {
      cwd: path.join(ROOT, 'src'),
      env: {
        ...process.env,
        NODE_PATH: path.join(ROOT, 'src', 'node_modules'),
      },
      shell: false,
      stdio: ['ignore', 'inherit', 'inherit'],
    }
  );

  child.on('close', async code => {
    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let results: Record<string, TestCaseExecution> = {};

    try {
      const tapContent = fs.readFileSync(tapFile, 'utf-8');
      const parsed = parseTapReport(tapContent, executedAt);
      results = parsed.results;
      passedCount = parsed.passedCount;
      failedCount = parsed.failedCount;
      skippedCount = parsed.skippedCount;
    } finally {
      try {
        fs.unlinkSync(tapFile);
      } catch {
        // ignore
      }
    }

    const partialSummary = {
      generatedAt: executedAt,
      totalTests: passedCount + failedCount + skippedCount,
      passedCount,
      failedCount,
      skippedCount,
      results,
    };

    const summary = testCaseFilter
      ? mergeReports(loadExistingReport(), partialSummary)
      : partialSummary;

    if (testCaseFilter && !results[testCaseFilter]) {
      console.warn(
        `\x1b[33m⚠ No automated test matched ${testCaseFilter}. The report was not updated for this id.\x1b[0m`
      );
    }

    fs.writeFileSync(REPORT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`\n\x1b[32m✔ Test execution report successfully generated at: ${REPORT_FILE}\x1b[0m`);
    console.log(`  - Total: ${summary.totalTests} | Passed: ${passedCount} | Failed: ${failedCount} | Skipped: ${skippedCount}\n`);

    const distWebJson = path.join(ROOT, 'src', 'web', 'dist', 'data.json');
    if (fs.existsSync(path.dirname(distWebJson))) {
      try {
        const { buildTraceWeaveReport } = await import('../src/application/build-report.js');
        const { report } = buildTraceWeaveReport({
          docsDir: path.join(ROOT, 'docs'),
          useCache: false,
          testReportPath: REPORT_FILE,
        });
        fs.writeFileSync(distWebJson, JSON.stringify(report), 'utf-8');
        console.log(`\x1b[32m✔ Synchronized latest test outcomes to Web Dashboard data: ${distWebJson}\x1b[0m\n`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`\x1b[33m⚠ Failed to auto-sync data.json: ${message}\x1b[0m\n`);
      }
    }

    process.exit(code !== 0 ? code || 1 : 0);
  });
}

runTests().catch(err => {
  console.error('Failed to execute test suite runner:', err);
  process.exit(1);
});
