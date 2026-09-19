import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseTestCaseFilter,
  resolveTestFilesForCase,
  testNamePatternForCase,
} from '../core/testing/formatTestRunCommand.js';
import { testResultsFromTap } from '../core/testing/parseTapTestReport.js';
import { mergeTestResultsReports } from '../core/workspace/merge-test-results.js';
import {
  loadTestResultsReportFile,
  writeTestResultsReportFile,
} from '../infrastructure/testing/loadTestResultsReport.js';

export interface RunNodeTestTapSuiteOptions {
  workspaceRoot: string;
  suiteCwd?: string;
  testsDir?: string;
  outputPath: string;
  testCaseFilter?: string;
  argv?: string[];
}

export async function runNodeTestTapSuite(options: RunNodeTestTapSuiteOptions): Promise<number> {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const suiteCwd = path.resolve(options.suiteCwd ?? workspaceRoot);
  const testsDir = options.testsDir
    ? path.resolve(workspaceRoot, options.testsDir)
    : path.join(workspaceRoot, 'tests');

  const filter =
    options.testCaseFilter ||
    parseTestCaseFilter(options.argv ?? process.argv.slice(2));

  const packageRoot = fs.existsSync(path.join(workspaceRoot, 'src', 'package.json'))
    ? path.join(workspaceRoot, 'src')
    : suiteCwd;
  const tsxCli = path.join(packageRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!fs.existsSync(tsxCli)) {
    console.error(`\x1b[31m✘ tsx not found at ${tsxCli}\x1b[0m`);
    return 1;
  }

  const testsPattern = path.join(testsDir, '**', '*.test.ts');
  let testTargets: string[] = [testsPattern];

  if (filter) {
    testTargets = resolveTestFilesForCase(testsDir, filter);
    if (testTargets.length === 0) {
      console.error(
        `\x1b[31m✘ No automated test file declares ${filter}. Add test('${filter}: ...') in tests/.\x1b[0m`
      );
      return 1;
    }
  }

  const tapFile = path.join(os.tmpdir(), `traceweave-tap-${process.pid}.tap`);
  const executedAt = new Date().toISOString();

  const nodeArgs = [
    tsxCli,
    '--test',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=tap',
    `--test-reporter-destination=${tapFile}`,
  ];
  if (filter) {
    nodeArgs.push(`--test-name-pattern=${testNamePatternForCase(filter)}`);
  }
  nodeArgs.push(...testTargets);

  const code = await new Promise<number>(resolve => {
    const child = spawn(process.execPath, nodeArgs, {
      cwd: packageRoot,
      env: {
        ...process.env,
        NODE_PATH: path.join(packageRoot, 'node_modules'),
      },
      shell: false,
      stdio: 'inherit',
    });
    child.on('error', () => resolve(1));
    child.on('close', c => resolve(c ?? 1));
  });

  let report = testResultsFromTap('', executedAt);
  try {
    const tapContent = fs.readFileSync(tapFile, 'utf-8');
    report = testResultsFromTap(tapContent, executedAt);
  } catch {
    // empty report
  } finally {
    try {
      fs.unlinkSync(tapFile);
    } catch {
      // ignore
    }
  }

  if (filter && !report.results[filter]) {
    console.warn(
      `\x1b[33m⚠ No automated test matched ${filter}. The report was not updated for this id.\x1b[0m`
    );
  }

  if (filter) {
    const existing = loadTestResultsReportFile(options.outputPath);
    if (existing) {
      report = mergeTestResultsReports([existing, report], 'last-wins');
    }
  }

  writeTestResultsReportFile(options.outputPath, report);
  return code !== 0 ? code || 1 : 0;
}
