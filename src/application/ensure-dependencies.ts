import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function resolvePackageRoot(): string {
  const candidates = [
    path.resolve(moduleDir, '..'),
    path.resolve(moduleDir, '../..'),
    path.resolve(process.cwd(), 'src'),
    path.resolve(process.cwd()),
  ];
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, 'package.json'))) {
      return root;
    }
  }
  throw new Error('TraceWeave package root (src/package.json) not found.');
}

export function hasInstalledDependencies(packageRoot: string): boolean {
  return fs.existsSync(path.join(packageRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'));
}

/**
 * Install npm dependencies on first run when src/node_modules is missing or incomplete.
 */
export function ensureDependenciesInstalled(options: { quiet?: boolean } = {}): void {
  const packageRoot = resolvePackageRoot();
  if (hasInstalledDependencies(packageRoot)) {
    return;
  }

  if (!options.quiet) {
    console.log('\n\x1b[36m📦 Installing TraceWeave dependencies (first run)...\x1b[0m');
  }

  const lockfile = path.join(packageRoot, 'package-lock.json');
  const npmArgs = fs.existsSync(lockfile)
    ? ['ci', '--prefix', packageRoot]
    : ['install', '--prefix', packageRoot];

  try {
    execFileSync('npm', npmArgs, {
      stdio: options.quiet ? 'pipe' : 'inherit',
      env: process.env,
    });
  } catch (error: any) {
    throw new Error(
      `Failed to install dependencies via npm. Ensure Node.js v20+ and npm are available.\n${error?.message ?? error}`
    );
  }

  if (!hasInstalledDependencies(packageRoot)) {
    throw new Error('Dependency installation finished but required packages are still missing.');
  }
}
