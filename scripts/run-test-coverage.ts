import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(ROOT, 'src');
const tsxCli = path.join(packageRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const c8Cli = path.join(packageRoot, 'node_modules', 'c8', 'bin', 'c8.js');
const runnerScript = path.join(ROOT, 'scripts', 'run-test-suite.ts');
const artifactScript = path.join(ROOT, 'scripts', 'build-coverage-artifacts.ts');

const buildWeb = spawnSync('npm', ['run', 'build:web'], {
  cwd: packageRoot,
  shell: true,
  stdio: 'inherit',
});
if (buildWeb.status !== 0) {
  process.exit(buildWeb.status ?? 1);
}

const coverageRun = spawnSync(
  process.execPath,
  [
    c8Cli,
    '--all',
    '--include',
    '**/*.ts',
    '--exclude',
    '**/*.test.ts',
    '--exclude',
    'web/**',
    '--reporter=lcov',
    '--reports-dir=../reports',
    tsxCli,
    runnerScript,
  ],
  {
    cwd: packageRoot,
    stdio: 'inherit',
  }
);

const artifactRun = spawnSync(process.execPath, [tsxCli, artifactScript], {
  cwd: packageRoot,
  stdio: 'inherit',
});

if (artifactRun.status !== 0) {
  process.exit(artifactRun.status ?? 1);
}

process.exit(coverageRun.status ?? 0);
