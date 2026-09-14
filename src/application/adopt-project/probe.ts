import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { ProjectProbeResult } from './types.js';

// -----------------------------------------------------------------------------
// 1. Probe: リポジトリの調査・解析
// -----------------------------------------------------------------------------
export function probeProject(targetDir: string): ProjectProbeResult {
  const resolved = path.resolve(targetDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Target directory does not exist: ${resolved}`);
  }

  const rootEntries = fs.readdirSync(resolved);
  const hasGit = rootEntries.includes('.git');
  const existingDocsDir = rootEntries.includes('docs');
  const existingSrcDir = rootEntries.includes('src');

  let projectName = path.basename(resolved);
  const languages: string[] = [];
  let testFramework: string | undefined;

  const pkgJsonPath = rootEntries.includes('package.json')
    ? path.join(resolved, 'package.json')
    : path.join(resolved, 'src', 'package.json');
  const hasPackageJson = fs.existsSync(pkgJsonPath);

  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (pkg.name) projectName = pkg.name;
      languages.push('JavaScript / TypeScript');

      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      if (allDeps.typescript) languages.push('TypeScript');
      if (allDeps.jest) testFramework = 'jest';
      else if (allDeps.vitest) testFramework = 'vitest';
      else if (allDeps.mocha) testFramework = 'mocha';
      else if (pkg.scripts && pkg.scripts.test) testFramework = 'npm test';
    } catch {
      // ignore parse error
    }
  }

  if (rootEntries.includes('pyproject.toml') || rootEntries.includes('requirements.txt') || rootEntries.includes('setup.py')) {
    languages.push('Python');
    if (!testFramework) testFramework = 'pytest';
  }
  if (rootEntries.includes('go.mod')) {
    languages.push('Go');
    if (!testFramework) testFramework = 'go test';
  }
  if (rootEntries.includes('Cargo.toml')) {
    languages.push('Rust');
    if (!testFramework) testFramework = 'cargo test';
  }

  let isGitDirty = false;
  if (hasGit) {
    try {
      const status = execSync('git status --porcelain', {
        cwd: resolved,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      isGitDirty = status.trim().length > 0;
    } catch {
      // git command failed or not in path
    }
  }

  return {
    projectName,
    languages: Array.from(new Set(languages)),
    testFramework,
    hasPackageJson,
    hasGit,
    isGitDirty,
    existingDocsDir,
    existingSrcDir,
    rootFiles: rootEntries,
  };
}
