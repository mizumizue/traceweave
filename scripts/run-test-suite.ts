import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

async function runTests(): Promise<void> {
  const tsxCli = path.join(ROOT, 'src', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const testsPattern = path.join(ROOT, 'tests', '**', '*.test.ts');

  // reports ディレクトリ作成
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const executedAt = new Date().toISOString();
  const results: Record<string, TestCaseExecution> = {};
  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  console.log('🚀 Running test suite with deterministic report capture...');

  const child = spawn(
    process.execPath,
    [tsxCli, '--test', '--test-reporter', 'tap', testsPattern],
    {
      cwd: path.join(ROOT, 'src'),
      env: {
        ...process.env,
        NODE_PATH: path.join(ROOT, 'src', 'node_modules'),
      },
      shell: false,
    }
  );

  let stdoutBuffer = '';
  let stderrBuffer = '';

  let currentSubtestTitle: string | null = null;
  let currentLogs: string[] = [];
  let inYamlBlock = false;
  let currentDuration = 0;
  let currentError: string | undefined = undefined;

  let lastTestCaseResults: TestCaseExecution[] = [];

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    stdoutBuffer += text;

    const lines = text.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line.startsWith('# Subtest:')) {
        currentSubtestTitle = line.replace('# Subtest:', '').trim();
        currentLogs = [line];
        inYamlBlock = false;
        currentDuration = 0;
        currentError = undefined;
      } else if (line.startsWith('ok ') || line.startsWith('not ok ')) {
        const isOk = line.startsWith('ok ');
        const isSkipped = line.includes('# SKIP') || line.includes('# TODO');
        const match = line.match(/^(?:ok|not ok)\s+\d+\s+-\s+(.*)$/);
        const title = match ? match[1].trim() : (currentSubtestTitle || line);
        currentLogs.push(line);

        const tcMatches = [...title.matchAll(/TC-\d{4}/g)].map(m => m[0]);
        if (tcMatches.length > 0) {
          const status = isSkipped ? 'skipped' : isOk ? 'passed' : 'failed';

          if (status === 'passed') passedCount += tcMatches.length;
          else if (status === 'failed') failedCount += tcMatches.length;
          else skippedCount += tcMatches.length;

          lastTestCaseResults = [];
          for (const tcId of tcMatches) {
            const execution: TestCaseExecution = {
              testCaseId: tcId,
              status,
              durationMs: currentDuration,
              testTitle: title,
              errorMessage: isOk ? undefined : (currentError || 'Test assertion failed'),
              outputLog: currentLogs.join('\n'),
              executedAt,
            };
            results[tcId] = execution;
            lastTestCaseResults.push(execution);
          }
        } else {
          lastTestCaseResults = [];
        }
      } else if (line === '---') {
        inYamlBlock = true;
        currentLogs.push(line);
      } else if (line === '...') {
        inYamlBlock = false;
        currentLogs.push(line);
        for (const item of lastTestCaseResults) {
          item.outputLog = currentLogs.join('\n');
        }
      } else if (inYamlBlock) {
        currentLogs.push(line);
        const durMatch = line.match(/duration_ms:\s*([\d.]+)/);
        if (durMatch) {
          currentDuration = parseFloat(durMatch[1]);
          for (const item of lastTestCaseResults) {
            item.durationMs = currentDuration;
          }
        }
        const errMatch = line.match(/error:\s*'?([^']+)'?/);
        if (errMatch) {
          currentError = errMatch[1];
          for (const item of lastTestCaseResults) {
            item.errorMessage = currentError;
          }
        }
      } else if (line.length > 0) {
        currentLogs.push(line);
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    stderrBuffer += text;
  });

  child.on('close', async (code) => {
    const summary: TestSuiteSummary = {
      generatedAt: executedAt,
      totalTests: passedCount + failedCount + skippedCount,
      passedCount,
      failedCount,
      skippedCount,
      results,
    };

    fs.writeFileSync(REPORT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`\n\x1b[32m✔ Test execution report successfully generated at: ${REPORT_FILE}\x1b[0m`);
    console.log(`  - Total: ${summary.totalTests} | Passed: ${passedCount} | Failed: ${failedCount} | Skipped: ${skippedCount}\n`);

    // Web ダッシュボードの静的データ（data.json）が存在する場合、最新のテストレポートを反映して自動更新
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
      } catch (err: any) {
        console.warn(`\x1b[33m⚠ Failed to auto-sync data.json: ${err.message}\x1b[0m\n`);
      }
    }

    if (code !== 0) {
      process.exit(code || 1);
    } else {
      process.exit(0);
    }
  });
}

runTests().catch((err) => {
  console.error('Failed to execute test suite runner:', err);
  process.exit(1);
});
