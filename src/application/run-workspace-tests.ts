import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mergeTestResultsReports } from '../core/workspace/merge-test-results.js';
import { ResolvedTestSuite, ResolvedWorkspace } from '../core/workspace/types.js';
import {
  loadTestResultsReportFile,
  writeTestResultsReportFile,
} from '../infrastructure/testing/loadTestResultsReport.js';
import { runNodeTestTapSuite } from './run-node-test-tap-suite.js';

export interface RunWorkspaceTestsOptions {
  workspace: ResolvedWorkspace;
  suiteIds?: string[];
  mergeOnly?: boolean;
  testCaseFilter?: string;
  afterSuite?: (suite: ResolvedTestSuite, exitCode: number) => void | Promise<void>;
}

export interface RunWorkspaceTestsResult {
  aggregatePath: string;
  exitCode: number;
  suiteOutcomes: { id: string; exitCode: number }[];
}

async function runShellCommand(command: string, cwd: string): Promise<number> {
  return new Promise(resolve => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', () => resolve(1));
    child.on('close', code => resolve(code ?? 1));
  });
}

async function runSuite(
  workspace: ResolvedWorkspace,
  suite: ResolvedTestSuite,
  testCaseFilter?: string
): Promise<{ exitCode: number; reportPath: string | null }> {
  const suiteCwd = path.resolve(workspace.workspaceRoot, suite.cwd);

  if (suite.capture === 'node-test-tap') {
    const fragmentPath =
      suite.fragmentPath ?? path.join(workspace.evidenceDir, 'suites', `${suite.id}.json`);
    const code = await runNodeTestTapSuite({
      workspaceRoot: workspace.workspaceRoot,
      suiteCwd,
      testsDir: suite.testsDir ?? undefined,
      outputPath: fragmentPath,
      testCaseFilter,
    });
    return { exitCode: code, reportPath: fragmentPath };
  }

  const exitCode = await runShellCommand(suite.run, suiteCwd);

  if (suite.capture === 'aggregate') {
    return { exitCode, reportPath: workspace.testResultsAggregatePath };
  }

  if (suite.capture === 'fragment' && suite.fragmentPath) {
    return { exitCode, reportPath: suite.fragmentPath };
  }

  return { exitCode, reportPath: null };
}

export async function runWorkspaceTests(
  options: RunWorkspaceTestsOptions
): Promise<RunWorkspaceTestsResult> {
  const { workspace } = options;
  let suites = workspace.suites;
  if (options.suiteIds?.length) {
    const wanted = new Set(options.suiteIds);
    suites = suites.filter(s => wanted.has(s.id));
    if (suites.length === 0) {
      throw new Error(`No suites matched: ${options.suiteIds.join(', ')}`);
    }
  }

  const suiteOutcomes: { id: string; exitCode: number }[] = [];
  const reports: import('../core/models/types.js').TestResultsReport[] = [];

  if (!options.mergeOnly) {
    for (const suite of suites) {
      const outcome = await runSuite(workspace, suite, options.testCaseFilter);
      suiteOutcomes.push({ id: suite.id, exitCode: outcome.exitCode });
      if (options.afterSuite) {
        await options.afterSuite(suite, outcome.exitCode);
      }
      if (outcome.reportPath && suite.evidenceTier === 'formal') {
        const report = loadTestResultsReportFile(outcome.reportPath);
        if (report) reports.push(report);
      }
    }
  } else {
    for (const suite of suites) {
      if (suite.evidenceTier !== 'formal') continue;
      const reportPath =
        suite.capture === 'aggregate'
          ? workspace.testResultsAggregatePath
          : suite.fragmentPath;
      if (reportPath) {
        const report = loadTestResultsReportFile(reportPath);
        if (report) reports.push(report);
      }
    }
  }

  const formalReports = reports;
  if (formalReports.length > 0) {
    const merged = mergeTestResultsReports(formalReports, workspace.mergeStrategy);
    writeTestResultsReportFile(workspace.testResultsAggregatePath, merged);
  }

  const exitCode = suiteOutcomes.some(s => s.exitCode !== 0) ? 1 : 0;
  return {
    aggregatePath: workspace.testResultsAggregatePath,
    exitCode: options.mergeOnly ? 0 : exitCode,
    suiteOutcomes,
  };
}
