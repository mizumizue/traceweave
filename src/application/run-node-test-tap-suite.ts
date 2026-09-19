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
  /** Absolute path or workspace-relative tests root for this suite. */
  testsDir?: string;
  outputPath: string;
  testCaseFilter?: string;
  argv?: string[];
}

const FORMAL_EXCLUDE_DIRS = new Set(['support', 'e2e']);

function listTestFilesUnder(rootDir: string, excludeTopLevelDirs?: Set<string>): string[] {
  const files: string[] = [];
  if (!fs.existsSync(rootDir)) return files;

  const walk = (dir: string, isTestsRoot: boolean): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (isTestsRoot && excludeTopLevelDirs?.has(entry.name)) continue;
        walk(fullPath, false);
        continue;
      }
      if (entry.name.endsWith('.test.ts')) files.push(fullPath);
    }
  };

  walk(rootDir, true);
  return files.sort();
}

export async function runNodeTestTapSuite(options: RunNodeTestTapSuiteOptions): Promise<number> {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const suiteCwd = path.resolve(options.suiteCwd ?? workspaceRoot);
  const testsRoot = path.join(workspaceRoot, 'tests');
  const suiteTestsDir = options.testsDir
    ? path.isAbsolute(options.testsDir)
      ? options.testsDir
      : path.resolve(workspaceRoot, options.testsDir)
    : null;

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

  let testTargets: string[];

  if (filter) {
    testTargets = resolveTestFilesForCase(testsRoot, filter);
    if (testTargets.length === 0) {
      console.error(
        `\x1b[31m✘ No automated test file declares ${filter}. Add test('${filter}: ...') in tests/.\x1b[0m`
      );
      return 1;
    }
  } else if (suiteTestsDir) {
    testTargets = listTestFilesUnder(suiteTestsDir);
  } else {
    testTargets = listTestFilesUnder(testsRoot, FORMAL_EXCLUDE_DIRS);
  }

  if (testTargets.length === 0) {
    console.error(`\x1b[31m✘ No test files found for suite under ${suiteTestsDir ?? testsRoot}\x1b[0m`);
    return 1;
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
