#!/usr/bin/env node
/**
 * Starts traceweave serve, runs Newman against fixtures/postman, writes traceweave-v1 fragment.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { resolveRepoRootFromScriptEntry } from './lib/repo-root.js';

const requireFromSrc = createRequire(path.join(resolveRepoRootFromScriptEntry(), 'src', 'package.json'));
const newman = requireFromSrc('newman') as typeof import('newman');
import { newmanReportToTraceWeaveV1 } from '../src/core/testing/newmanReportToTraceWeaveV1.js';
import { writeTestResultsReportFile } from '../src/infrastructure/testing/loadTestResultsReport.js';
const ROOT = resolveRepoRootFromScriptEntry();
const PORT = Number(process.env.TRACEWEAVE_NEWMAN_PORT || 37555);
const FRAGMENT =
  process.env.TRACEWEAVE_NEWMAN_FRAGMENT ||
  path.join(ROOT, 'reports', 'suites', 'newman.json');
const RAW_REPORT = path.join(ROOT, 'reports', 'suites', 'newman-newman-raw.json');

const COLLECTION = path.join(ROOT, 'fixtures', 'postman', 'traceweave-serve-api.postman_collection.json');
const ENVIRONMENT = path.join(ROOT, 'fixtures', 'postman', 'traceweave-serve-api.postman_environment.json');

function repositoryPath(...segments: string[]): string {
  return path.join(ROOT, ...segments);
}

async function waitForServeReady(port: number, child: ChildProcess, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  let stderr = '';
  child.stderr?.on('data', chunk => {
    stderr += String(chunk);
  });

  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`serve exited with code ${child.exitCode}\n${stderr}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/data`);
      if (response.ok) return;
    } catch {
      // not ready
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`serve did not become ready within ${timeoutMs}ms\n${stderr}`);
}

function startServe(port: number): ChildProcess {
  const tsxCli = repositoryPath('src', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const cliEntry = repositoryPath('src', 'cli', 'index.ts');
  return spawn(process.execPath, [tsxCli, cliEntry, 'serve', '--port', String(port), '--docs', 'docs'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
}

function runNewman(baseUrl: string, rawExportPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    newman.run(
      {
        collection: COLLECTION,
        environment: ENVIRONMENT,
        envVar: [{ key: 'baseUrl', value: baseUrl }],
        reporters: ['json'],
        reporter: {
          json: { export: rawExportPath },
        },
      },
      (err, summary) => {
        if (err) {
          reject(err);
          return;
        }
        const failed = summary.run.failures?.length ?? 0;
        resolve(failed === 0 ? 0 : 1);
      }
    );
  });
}

async function main(): Promise<void> {
  const webDist = repositoryPath('src', 'web', 'dist', 'index.html');
  if (!fs.existsSync(webDist)) {
    console.error(
      'Web dist missing. Run: npm --prefix src run build:web (or npm --prefix src test once).'
    );
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(FRAGMENT), { recursive: true });
  fs.mkdirSync(path.dirname(RAW_REPORT), { recursive: true });

  const baseUrl = `http://127.0.0.1:${PORT}`;
  console.log(`\n🧪 Newman API suite (serve ${baseUrl})...\n`);

  const child = startServe(PORT);
  let exitCode = 1;

  try {
    await waitForServeReady(PORT, child);
    exitCode = await runNewman(baseUrl, RAW_REPORT);

    const raw = JSON.parse(fs.readFileSync(RAW_REPORT, 'utf8'));
    const report = newmanReportToTraceWeaveV1(raw);
    writeTestResultsReportFile(FRAGMENT, report);
    console.log(`\n✔ Newman fragment: ${FRAGMENT} (${report.totalTests} TC row(s))\n`);
  } finally {
    child.kill();
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
