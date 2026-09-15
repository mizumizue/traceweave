import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveCoverageReportPath } from '../core/coverage/CoverageReportLoader.js';
import { resolveProjectLayout } from '../infrastructure/system/resolveRepoRoot.js';
import { ensureDependenciesInstalled } from './ensure-dependencies.js';

export type EnsureUnitCoverageResult = 'present' | 'generated' | 'unavailable';

export function ensureUnitCoverageReport(options: {
  projectRoot?: string;
  docsDir?: string;
  quiet?: boolean;
} = {}): EnsureUnitCoverageResult {
  const { projectRoot } = resolveProjectLayout({
    projectRoot: options.projectRoot,
    docsDir: options.docsDir,
    moduleUrl: import.meta.url,
  });
  const coveragePath = resolveCoverageReportPath(projectRoot);
  if (fs.existsSync(coveragePath)) {
    return 'present';
  }

  ensureDependenciesInstalled({ quiet: options.quiet });
  const packageRoot = path.join(projectRoot, 'src');
  const tsxCli = path.join(packageRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const runnerScript = path.join(projectRoot, 'scripts', 'run-test-suite.ts');

  if (!fs.existsSync(runnerScript) || !fs.existsSync(tsxCli)) {
    if (!options.quiet) {
      console.warn('\x1b[33m⚠ Test suite runner not found; unit coverage will stay pending.\x1b[0m\n');
    }
    return 'unavailable';
  }

  if (!options.quiet) {
    console.log(
      '\n\x1b[36m📊 Unit coverage report missing; running test suite to generate reports/coverage-summary.json...\x1b[0m\n'
    );
  }

  try {
    execFileSync(process.execPath, [tsxCli, runnerScript], {
      cwd: packageRoot,
      stdio: options.quiet ? 'pipe' : 'inherit',
      env: process.env,
    });
  } catch {
    // ponytail: coverage is still written when some tests fail; check the artifact.
  }

  if (fs.existsSync(coveragePath)) {
    if (!options.quiet) {
      console.log('\x1b[32m✔ Unit coverage report is ready.\x1b[0m\n');
    }
    return 'generated';
  }

  if (!options.quiet) {
    console.warn('\x1b[33m⚠ Could not generate unit coverage report; dashboard will show pending.\x1b[0m\n');
  }
  return 'unavailable';
}
