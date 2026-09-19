import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseTestCaseFilter } from '../src/core/testing/formatTestRunCommand.js';
import { syncDashboardArtifacts } from '../src/application/sync-dashboard-artifacts.js';
import { runWorkspaceTests } from '../src/application/run-workspace-tests.js';
import { resolveWorkspace } from '../src/application/workspace/resolveWorkspace.js';
import { resolveRepoRootFromScriptEntry } from './lib/repo-root.js';
import { dropLegacyTestResultArtifacts } from './lib/drop-legacy-test-artifacts.js';

const ROOT = resolveRepoRootFromScriptEntry();

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
  await ensureWebDistBuilt();
  const testCaseFilter = parseTestCaseFilter(process.argv.slice(2));
  const workspace = resolveWorkspace({ workspaceRoot: ROOT });

  const suitesDir = path.join(ROOT, 'reports', 'suites');
  if (
    dropLegacyTestResultArtifacts({
      aggregatePath: workspace.testResultsAggregatePath,
      suitesDir,
    })
  ) {
    console.log(
      '\x1b[33m⚠ Dropped legacy TC-xxxx test result artifacts; suites will regenerate stratum keys.\x1b[0m\n'
    );
  }

  if (testCaseFilter) {
    console.log(`🚀 Running filtered test suite for ${testCaseFilter}...`);
  } else {
    console.log('🚀 Running test suite with deterministic report capture...');
  }

  const distWebJson = path.join(ROOT, 'src', 'web', 'dist', 'data.json');
  if (fs.existsSync(path.dirname(distWebJson))) {
    try {
      syncDashboardArtifacts({
        projectRoot: ROOT,
        docsDir: workspace.docsDir,
        testReportPath: workspace.testResultsAggregatePath,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`\x1b[33m⚠ Failed to prepare data.json before tests: ${message}\x1b[0m\n`);
    }
  }

  const result = await runWorkspaceTests({
    workspace,
    testCaseFilter,
    afterSuite: async suite => {
      if (suite.id !== 'node') return;
      const distWebJson = path.join(ROOT, 'src', 'web', 'dist', 'data.json');
      if (!fs.existsSync(path.dirname(distWebJson))) return;
      try {
        syncDashboardArtifacts({
          projectRoot: ROOT,
          docsDir: workspace.docsDir,
          testReportPath: workspace.testResultsAggregatePath,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`\x1b[33m⚠ Failed to refresh data.json after node suite: ${message}\x1b[0m\n`);
      }
    },
  });

  console.log(
    `\n\x1b[32m✔ Test execution report successfully generated at: ${result.aggregatePath}\x1b[0m\n`
  );

  if (fs.existsSync(path.dirname(distWebJson))) {
    try {
      syncDashboardArtifacts({
        projectRoot: ROOT,
        docsDir: workspace.docsDir,
        testReportPath: result.aggregatePath,
      });
      console.log(`\x1b[32m✔ Synchronized latest test outcomes to Web Dashboard data: ${distWebJson}\x1b[0m\n`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`\x1b[33m⚠ Failed to auto-sync data.json: ${message}\x1b[0m\n`);
    }
  }

  process.exit(result.exitCode);
}

runTests().catch(err => {
  console.error('Failed to execute test suite runner:', err);
  process.exit(1);
});
