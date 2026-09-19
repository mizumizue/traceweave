import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { syncDashboardArtifacts, SyncDashboardArtifactsOptions } from './sync-dashboard-artifacts.js';
import type { ResolvedWorkspace } from '../core/workspace/types.js';

export async function ensureWebDashboardDist(projectRoot: string): Promise<void> {
  const webDistIndex = path.join(projectRoot, 'src', 'web', 'dist', 'index.html');
  if (process.env.TW_FORCE_WEB_BUILD === '1' || !fs.existsSync(webDistIndex)) {
    console.log('⚙ Building web dashboard (dist missing or TW_FORCE_WEB_BUILD=1)...');
    await new Promise<void>((resolve, reject) => {
      const child = spawn('npm', ['run', 'build:web', '--prefix', path.join(projectRoot, 'src')], {
        cwd: projectRoot,
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

export function syncWebDashboardData(options: SyncDashboardArtifactsOptions): void {
  syncDashboardArtifacts(options);
}

export async function prepareWorkspaceTestRun(
  workspace: ResolvedWorkspace,
  options?: { skipWebPrep?: boolean }
): Promise<void> {
  if (options?.skipWebPrep) return;
  await ensureWebDashboardDist(workspace.workspaceRoot);
  const distDir = path.join(workspace.workspaceRoot, 'src', 'web', 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) return;
  try {
    syncWebDashboardData({
      projectRoot: workspace.workspaceRoot,
      docsDir: workspace.docsDir,
      testReportPath: workspace.testResultsAggregatePath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`\x1b[33m⚠ Failed to prepare data.json before tests: ${message}\x1b[0m\n`);
  }
}

export function refreshWebDashboardDataAfterNodeSuite(workspace: ResolvedWorkspace): void {
  const distDir = path.join(workspace.workspaceRoot, 'src', 'web', 'dist');
  if (!fs.existsSync(distDir)) return;
  try {
    syncWebDashboardData({
      projectRoot: workspace.workspaceRoot,
      docsDir: workspace.docsDir,
      testReportPath: workspace.testResultsAggregatePath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`\x1b[33m⚠ Failed to refresh data.json after node suite: ${message}\x1b[0m\n`);
  }
}
