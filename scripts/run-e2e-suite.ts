#!/usr/bin/env node
/**
 * Builds web dist if needed, runs Playwright, writes traceweave-v1 fragment (ADR-0011).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { syncDashboardArtifacts } from '../src/application/sync-dashboard-artifacts.js';
import { playwrightReportToTraceWeaveV1 } from '../src/core/testing/playwrightReportToTraceWeaveV1.js';
import { writeTestResultsReportFile } from '../src/infrastructure/testing/loadTestResultsReport.js';
import { loadWorkspaceConfig } from '../src/infrastructure/workspace/loadWorkspaceConfig.js';
import { resolveRepoRootFromScriptEntry } from './lib/repo-root.js';

const ROOT = resolveRepoRootFromScriptEntry();
const FRAGMENT =
  process.env.TRACEWEAVE_E2E_FRAGMENT || path.join(ROOT, 'reports', 'suites', 'e2e.json');
const RAW_REPORT =
  process.env.TRACEWEAVE_E2E_RAW ||
  path.join(ROOT, 'reports', 'suites', 'e2e-playwright-raw.json');
const CONFIG = path.join(ROOT, 'tests', 'e2e', 'playwright.config.mjs');

async function ensureWebDist(): Promise<void> {
  const index = path.join(ROOT, 'src', 'web', 'dist', 'index.html');
  if (process.env.TW_FORCE_WEB_BUILD === '1' || !fs.existsSync(index)) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('npm', ['run', 'build:web', '--prefix', path.join(ROOT, 'src')], {
        cwd: ROOT,
        shell: true,
        stdio: 'inherit',
      });
      child.on('error', reject);
      child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`build:web exit ${code}`))));
    });
  }
}

function runPlaywright(): Promise<number> {
  const pwCli = path.join(ROOT, 'src', 'node_modules', '@playwright', 'test', 'cli.js');
  if (!fs.existsSync(pwCli)) {
    console.error(`\x1b[31m✘ @playwright/test not installed. Run npm install in src/.\x1b[0m`);
    return Promise.resolve(1);
  }

  return new Promise(resolve => {
    const srcModules = path.join(ROOT, 'src', 'node_modules');
    const child = spawn(
      process.execPath,
      [pwCli, 'test', '-c', CONFIG],
      {
        cwd: ROOT,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_PATH: srcModules,
        },
      }
    );
    child.on('error', () => resolve(1));
    child.on('close', code => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  if (process.env.TW_SKIP_E2E === '1') {
    console.log('\x1b[33m⚠ TW_SKIP_E2E=1 — skipping browser E2E suite.\x1b[0m');
    process.exit(0);
  }

  await ensureWebDist();
  const workspace = loadWorkspaceConfig(ROOT);
  try {
    syncDashboardArtifacts({
      projectRoot: ROOT,
      docsDir: workspace.docsDir,
      testReportPath: workspace.testResultsAggregatePath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`\x1b[33m⚠ Failed to prepare data.json for E2E: ${message}\x1b[0m`);
  }
  const exitCode = await runPlaywright();

  const executedAt = new Date().toISOString();
  let report = playwrightReportToTraceWeaveV1({}, executedAt);
  try {
    const raw = JSON.parse(fs.readFileSync(RAW_REPORT, 'utf-8')) as import('../src/core/testing/playwrightReportToTraceWeaveV1.js').PlaywrightJsonReportLike;
    report = playwrightReportToTraceWeaveV1(raw, executedAt);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`\x1b[33m⚠ Could not read Playwright JSON at ${RAW_REPORT}: ${message}\x1b[0m`);
  }

  fs.mkdirSync(path.dirname(FRAGMENT), { recursive: true });
  writeTestResultsReportFile(FRAGMENT, report);
  console.log(`\x1b[32m✔ E2E fragment: ${FRAGMENT}\x1b[0m`);

  process.exit(exitCode !== 0 ? exitCode || 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
