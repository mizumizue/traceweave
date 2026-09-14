import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot } from '../../infrastructure/system/resolveRepoRoot.js';
import type { ProjectProbeResult } from './types.js';

export function resolveTestCommand(testFramework?: string): string {
  switch (testFramework) {
    case 'jest':
      return 'npx jest';
    case 'vitest':
      return 'npx vitest run';
    case 'mocha':
      return 'npx mocha';
    case 'pytest':
      return 'pytest';
    case 'go test':
      return 'go test ./...';
    case 'cargo test':
      return 'cargo test';
    default:
      return 'npm test';
  }
}

export function generateAdoptQualitySetupDoc(projectName: string, testCmd: string): string {
  return `# ${projectName} TraceWeave 品質セットアップガイド

TraceWeave adopt 後に、テストケース文書・自動テスト・CI を V字モデルに接続するためのチェックリストです。

## 1. スターター TC をプロジェクト固有の REQ/SPEC に沿って書き直す

- \`docs/test-cases/TC-0001.md\` は REQ-0001 の **AC-001**（正常系）を検証する手順に更新する。
- \`docs/test-cases/TC-0002.md\` は REQ-0001 の **AC-002**（異常系）を検証する手順に更新する。
- \`### Steps\` と \`### Expected Results\` は、\`docs/requirements/REQ-0001.md\` の AC および \`docs/specifications/SPEC-0001.md\` の契約条項と 1 対 1 で対応させる。
- 汎用文言（「正常系入力に対する戻り値」等）のまま残さない。

## 2. traceweave-test-case-review で意味監査を通す

Cursor エージェントに次を指示する。

> TC-0001 と TC-0002 を traceweave-test-case-review スキルで監査して

監査では oracle / feasibility / soundness / tautology / stratum-fit の 5 軸で REVISE 指摘がゼロになるまで修正する。

## 3. テストコードに TC-xxxx 命名とレポート出力を整備する

- 自動テスト名の先頭に \`TC-0001:\` / \`TC-0002:\` を付与する（例: \`test('TC-0001: 正常入力で終了コード 0 となること', ...)\`）。
- テスト実行後に TraceWeave 形式のレポートを生成する。

\`\`\`bash
node scripts/traceweave-capture-test-report.mjs
\`\`\`

生成先: \`reports/test-results.json\`（ダッシュボードおよび QA 証跡と動的結合される）。

検出ランナー: \`${testCmd}\`

## 4. CI で traceweave check とテスト実行を回す

\`.github/workflows/traceweave-governance.yml\` を有効化し、プルリクエストごとに次を実行する。

1. \`./bin/traceweave check\`（ドキュメント整合性）
2. \`node scripts/traceweave-capture-test-report.mjs\`（TC 実行レポート）
3. \`./bin/traceweave check --strict\`（未テスト要件の検出、任意）

TraceWeave CLI が PATH 上で解決できること（\`INSTALL_GUIDE.md\` 参照）を CI 実行前に確認する。

## 5. 機械的ゲート（任意）

\`\`\`bash
./bin/traceweave adopt-quality-check
\`\`\`

品質キットの配備漏れと TC ボイラープレート残存を警告する。
`;
}

export function generateTestCaptureScript(probe: ProjectProbeResult): string {
  const framework = probe.testFramework || 'npm test';
  return `#!/usr/bin/env node
/**
 * TraceWeave adopt quality kit: capture test results keyed by TC-xxxx into reports/test-results.json.
 * Detected framework at adopt time: ${framework}
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const REPORT_FILE = path.join(REPORTS_DIR, 'test-results.json');

function findPackageRoot() {
  if (fs.existsSync(path.join(ROOT, 'package.json'))) return ROOT;
  if (fs.existsSync(path.join(ROOT, 'src', 'package.json'))) return path.join(ROOT, 'src');
  return ROOT;
}

function extractTcIds(text) {
  return [...String(text).matchAll(/TC-\\d{4}/g)].map((m) => m[0]);
}

function writeReport(results, executedAt) {
  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  for (const entry of Object.values(results)) {
    if (entry.status === 'passed') passedCount += 1;
    else if (entry.status === 'failed') failedCount += 1;
    else skippedCount += 1;
  }
  const summary = {
    generatedAt: executedAt,
    totalTests: passedCount + failedCount + skippedCount,
    passedCount,
    failedCount,
    skippedCount,
    results,
  };
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
  console.log('Test report written to ' + REPORT_FILE);
  return summary;
}

function upsertResult(results, tcId, payload) {
  results[tcId] = {
    testCaseId: tcId,
    status: payload.status,
    durationMs: payload.durationMs ?? 0,
    testTitle: payload.testTitle,
    errorMessage: payload.errorMessage,
    outputLog: payload.outputLog,
    executedAt: payload.executedAt,
  };
}

function parseTapReport(tapContent, executedAt) {
  const results = {};
  const blocks = tapContent.split(/^# Subtest:/m).slice(1);
  for (const block of blocks) {
    const title = block.split('\\n')[0]?.trim() ?? '';
    const resultLine = block.match(/^(?:ok|not ok) \\d+ - (.*)$/m);
    if (!resultLine) continue;
    const line = resultLine[0];
    const fullTitle = resultLine[1].trim();
    const isOk = line.startsWith('ok ');
    const isSkipped = line.includes('# SKIP') || line.includes('# TODO');
    const status = isSkipped ? 'skipped' : isOk ? 'passed' : 'failed';
    const durMatch = block.match(/duration_ms:\\s*([\\d.]+)/);
    const durationMs = durMatch ? parseFloat(durMatch[1]) : 0;
    const errMatch = block.match(/error:\\s*'?([^'\\n]+)'?/);
    const errorMessage = isOk ? undefined : errMatch?.[1] ?? 'Test assertion failed';
    for (const tcId of extractTcIds(fullTitle)) {
      upsertResult(results, tcId, {
        status,
        durationMs,
        testTitle: fullTitle || title,
        errorMessage,
        outputLog: '# Subtest: ' + title + '\\n' + block.trim(),
        executedAt,
      });
    }
  }
  return results;
}

function parseJestJson(jsonPath, executedAt) {
  const results = {};
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  for (const suite of data.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? []) {
      const title = assertion.fullName || assertion.title || '';
      const status =
        assertion.status === 'passed'
          ? 'passed'
          : assertion.status === 'pending' || assertion.status === 'skipped'
            ? 'skipped'
            : 'failed';
      for (const tcId of extractTcIds(title)) {
        upsertResult(results, tcId, {
          status,
          durationMs: assertion.duration ?? 0,
          testTitle: title,
          errorMessage: assertion.failureMessages?.join('\\n'),
          outputLog: assertion.failureMessages?.join('\\n'),
          executedAt,
        });
      }
    }
  }
  return results;
}

function detectFramework(cwd) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (deps.jest) return 'jest';
    if (deps.vitest) return 'vitest';
    if (deps.mocha) return 'mocha';
  } catch {
    // ignore
  }
  return '${framework}';
}

function runNodeTestTap(cwd, executedAt) {
  const tapFile = path.join(os.tmpdir(), 'traceweave-adopt-' + process.pid + '.tap');
  const testsDir = fs.existsSync(path.join(ROOT, 'tests'))
    ? path.join(ROOT, 'tests')
    : path.join(cwd, 'tests');
  const pattern = fs.existsSync(testsDir) ? path.join(testsDir, '**', '*.test.*') : path.join(cwd, '**', '*.test.*');
  const args = [
    '--test',
    '--test-reporter=tap',
    '--test-reporter-destination=' + tapFile,
    pattern,
  ];
  const child = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', shell: false });
  let results = {};
  try {
    results = parseTapReport(fs.readFileSync(tapFile, 'utf-8'), executedAt);
  } finally {
    try {
      fs.unlinkSync(tapFile);
    } catch {
      // ignore
    }
  }
  writeReport(results, executedAt);
  process.exit(child.status ?? 1);
}

function runJest(cwd, executedAt) {
  const jsonOut = path.join(os.tmpdir(), 'traceweave-jest-' + process.pid + '.json');
  const child = spawnSync('npx', ['jest', '--json', '--outputFile=' + jsonOut], {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
  const results = fs.existsSync(jsonOut) ? parseJestJson(jsonOut, executedAt) : {};
  try {
    fs.unlinkSync(jsonOut);
  } catch {
    // ignore
  }
  writeReport(results, executedAt);
  process.exit(child.status ?? 1);
}

function runVitest(cwd, executedAt) {
  const jsonOut = path.join(REPORTS_DIR, '.vitest-results.json');
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const child = spawnSync('npx', ['vitest', 'run', '--reporter=json', '--outputFile=' + jsonOut], {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
  let results = {};
  if (fs.existsSync(jsonOut)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonOut, 'utf-8'));
      for (const file of data.testResults ?? data.files ?? []) {
        for (const task of file.tasks ?? file.assertionResults ?? []) {
          const title = task.name || task.fullName || task.title || '';
          const status = task.result?.state === 'pass' || task.status === 'passed' ? 'passed' : task.result?.state === 'skip' ? 'skipped' : 'failed';
          for (const tcId of extractTcIds(title)) {
            upsertResult(results, tcId, {
              status,
              durationMs: task.result?.duration ?? task.duration ?? 0,
              testTitle: title,
              errorMessage: task.result?.errors?.[0]?.message,
              outputLog: task.result?.errors?.[0]?.stack,
              executedAt,
            });
          }
        }
      }
    } catch {
      // ignore parse errors
    }
    try {
      fs.unlinkSync(jsonOut);
    } catch {
      // ignore
    }
  }
  writeReport(results, executedAt);
  process.exit(child.status ?? 1);
}

function main() {
  const cwd = findPackageRoot();
  const executedAt = new Date().toISOString();
  const framework = detectFramework(cwd);
  if (framework === 'jest') return runJest(cwd, executedAt);
  if (framework === 'vitest') return runVitest(cwd, executedAt);
  if (framework === 'node:test' || framework === 'npm test') return runNodeTestTap(cwd, executedAt);
  console.warn('Unsupported or unknown test framework: ' + framework);
  console.warn('Run your test suite manually and map titles to TC-xxxx, then integrate reports/test-results.json.');
  writeReport({}, executedAt);
  process.exit(0);
}

main();
`;
}

export function generateCiWorkflow(): string {
  return `name: TraceWeave Governance

on:
  push:
    paths:
      - 'docs/**'
      - 'scripts/traceweave-capture-test-report.mjs'
      - '.github/workflows/traceweave-governance.yml'
  pull_request:
    paths:
      - 'docs/**'
      - 'scripts/traceweave-capture-test-report.mjs'
      - '.github/workflows/traceweave-governance.yml'

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Resolve npm workspace
        id: npm
        shell: bash
        run: |
          if [ -f src/package.json ]; then
            echo "dir=src" >> "$GITHUB_OUTPUT"
          elif [ -f package.json ]; then
            echo "dir=." >> "$GITHUB_OUTPUT"
          else
            echo "dir=" >> "$GITHUB_OUTPUT"
          fi

      - uses: actions/setup-node@v4
        if: steps.npm.outputs.dir != ''
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: \${{ steps.npm.outputs.dir == 'src' && 'src/package-lock.json' || 'package-lock.json' }}

      - name: Install dependencies
        if: steps.npm.outputs.dir != ''
        run: npm ci
        working-directory: \${{ steps.npm.outputs.dir }}

      - name: TraceWeave documentation check
        run: ./bin/traceweave check

      - name: Run tests and capture TC report
        if: steps.npm.outputs.dir != ''
        run: node scripts/traceweave-capture-test-report.mjs

      - name: Strict traceability check
        run: ./bin/traceweave check --strict
`;
}

export function generateQualityKitFiles(
  probe: ProjectProbeResult
): Record<string, string> {
  const testCmd = resolveTestCommand(probe.testFramework);
  return {
    'docs/ADOPT_QUALITY_SETUP.md': generateAdoptQualitySetupDoc(probe.projectName, testCmd),
    'scripts/traceweave-capture-test-report.mjs': generateTestCaptureScript(probe),
    '.github/workflows/traceweave-governance.yml': generateCiWorkflow(),
  };
}

const QUALITY_SKILL_NAMES = ['traceweave-test-case-review', 'traceweave-test-fixture'] as const;
const QUALITY_RULE_NAMES = ['test-writing-guidelines.mdc'] as const;

export function copyQualityCursorAssets(targetDir: string): string[] {
  const repoRoot = resolveRepoRoot(import.meta.url);
  const created: string[] = [];

  for (const skillName of QUALITY_SKILL_NAMES) {
    const srcSkill = path.join(repoRoot, '.cursor', 'skills', skillName, 'SKILL.md');
    if (!fs.existsSync(srcSkill)) continue;
    const destRel = path.join('.cursor', 'skills', skillName, 'SKILL.md');
    const destFull = path.join(targetDir, destRel);
    if (fs.existsSync(destFull)) continue;
    fs.mkdirSync(path.dirname(destFull), { recursive: true });
    fs.copyFileSync(srcSkill, destFull);
    created.push(destRel.replace(/\\\\/g, '/'));
  }

  for (const ruleName of QUALITY_RULE_NAMES) {
    const srcRule = path.join(repoRoot, '.cursor', 'rules', ruleName);
    if (!fs.existsSync(srcRule)) continue;
    const destRel = path.join('.cursor', 'rules', ruleName);
    const destFull = path.join(targetDir, destRel);
    if (fs.existsSync(destFull)) continue;
    fs.mkdirSync(path.dirname(destFull), { recursive: true });
    fs.copyFileSync(srcRule, destFull);
    created.push(destRel.replace(/\\\\/g, '/'));
  }

  return created;
}
