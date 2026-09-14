import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildTraceWeaveReport } from './build-report.js';
import { ensureDependenciesInstalled, resolvePackageRoot as resolveDepsPackageRoot } from './ensure-dependencies.js';

export interface BuildWebDashboardOptions {
  docsDir: string;
  outDir?: string;
  subjectOverride?: string;
  /** Skip Vite rebuild when index.html already exists (used by serve). */
  skipViteIfPresent?: boolean;
  quiet?: boolean;
}

export function resolvePackageRoot(): string {
  const root = resolveDepsPackageRoot();
  if (!fs.existsSync(path.join(root, 'web', 'vite.config.ts'))) {
    throw new Error(`TraceWeave web assets not found under "${root}/web".`);
  }
  return root;
}

export function resolveDefaultWebDistDir(packageRoot = resolvePackageRoot()): string {
  return path.join(packageRoot, 'web', 'dist');
}

function resolveViteExecutable(packageRoot: string): string {
  ensureDependenciesInstalled();
  const viteBin = path.join(packageRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    throw new Error(`Vite is not installed in "${packageRoot}/node_modules".`);
  }
  return viteBin;
}

function runViteBuild(packageRoot: string, quiet = false): void {
  const viteBin = resolveViteExecutable(packageRoot);
  const viteConfig = path.join(packageRoot, 'web', 'vite.config.ts');
  if (!quiet) {
    console.log('\n\x1b[36m⚙ Building web dashboard assets...\x1b[0m');
  }
  execFileSync(process.execPath, [viteBin, 'build', '--config', viteConfig], {
    cwd: packageRoot,
    stdio: quiet ? 'pipe' : 'inherit',
    env: process.env,
  });
}

function writeDataJson(docsDir: string, targetDir: string, subjectOverride?: string): void {
  const { report } = buildTraceWeaveReport(
    subjectOverride ? { docsDir, subjectOverride } : { docsDir }
  );
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'data.json'), JSON.stringify(report), 'utf-8');
}

function copyBuiltAssets(sourceDir: string, targetDir: string): void {
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

/**
 * Build the full React dashboard (Vite bundle + data.json).
 * Used by `traceweave build` and `traceweave serve`.
 */
export function buildWebDashboard(options: BuildWebDashboardOptions): string {
  const packageRoot = resolvePackageRoot();
  const webDistDir = resolveDefaultWebDistDir(packageRoot);
  const outDir = path.resolve(options.outDir ?? webDistDir);
  const indexPath = path.join(webDistDir, 'index.html');
  const needsVite =
    !options.skipViteIfPresent || !fs.existsSync(indexPath);

  if (needsVite) {
    runViteBuild(packageRoot, options.quiet);
  }

  if (!fs.existsSync(indexPath)) {
    throw new Error(`Dashboard build failed: index.html was not created in "${webDistDir}"`);
  }

  if (outDir === webDistDir) {
    writeDataJson(options.docsDir, webDistDir, options.subjectOverride);
    return webDistDir;
  }

  copyBuiltAssets(webDistDir, outDir);
  writeDataJson(options.docsDir, outDir, options.subjectOverride);
  return outDir;
}

