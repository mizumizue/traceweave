import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// TRACEWEAVE_ROOT points to repo root (traceweave/)
const TRACEWEAVE_ROOT = path.resolve(__dirname, '../../');

export type AdoptionMode = 'overlay' | 'restructure';

export interface AdoptionOptions {
  targetDir?: string;
  mode?: AdoptionMode;
  backupDir?: string;
  noBackup?: boolean;
  dryRun?: boolean;
  rollbackPath?: string;
  force?: boolean;
  projectName?: string;
  silent?: boolean;
}

export interface ProjectProbeResult {
  projectName: string;
  languages: string[];
  testFramework?: string;
  hasPackageJson: boolean;
  hasGit: boolean;
  isGitDirty: boolean;
  existingDocsDir: boolean;
  existingSrcDir: boolean;
  rootFiles: string[];
}

export interface BackupManifest {
  version: '1.0.0';
  createdAt: string;
  mode: AdoptionMode;
  targetDir: string;
  backupDir: string;
  backedUpFiles: string[];
  createdFiles: string[];
}

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

// -----------------------------------------------------------------------------
// 2. Backup & Rollback: バックアップとロールバック
// -----------------------------------------------------------------------------
export function createBackup(
  targetDir: string,
  mode: AdoptionMode,
  customBackupDir?: string
): { backupDir: string; manifest: BackupManifest } {
  const resolvedTarget = path.resolve(targetDir);
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const defaultDir = path.join(resolvedTarget, '.traceweave-backup', `${timestamp}_${mode}`);
  const backupDir = customBackupDir ? path.resolve(customBackupDir) : defaultDir;

  fs.mkdirSync(backupDir, { recursive: true });

  const backedUpFiles: string[] = [];
  const entriesToBackup = mode === 'restructure'
    ? fs.readdirSync(resolvedTarget).filter(e => e !== '.git' && e !== 'node_modules' && e !== '.traceweave-backup')
    : ['docs', 'bin', '.cursor', 'scripts', 'DEVELOPER_GUIDE.md', 'SYSTEM_OVERVIEW.md'].filter(e =>
        fs.existsSync(path.join(resolvedTarget, e))
      );

  for (const entry of entriesToBackup) {
    const srcPath = path.join(resolvedTarget, entry);
    const destPath = path.join(backupDir, entry);
    copyRecursiveSync(srcPath, destPath);
    backedUpFiles.push(entry);
  }

  const manifest: BackupManifest = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    mode,
    targetDir: resolvedTarget,
    backupDir,
    backedUpFiles,
    createdFiles: [],
  };

  fs.writeFileSync(
    path.join(backupDir, 'backup-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return { backupDir, manifest };
}

export function rollbackAdoption(backupPath: string, silent = false): void {
  const resolved = path.resolve(backupPath);
  const manifestPath = fs.existsSync(path.join(resolved, 'backup-manifest.json'))
    ? path.join(resolved, 'backup-manifest.json')
    : resolved;

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found: ${manifestPath}`);
  }

  const manifestDir = path.dirname(manifestPath);
  const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const targetDir = manifest.targetDir;

  if (!silent) {
    console.log(`\n⏪ Rolling back TraceWeave changes in "${targetDir}" from backup "${manifestDir}"...`);
  }

  // 1. Remove files created by adopt
  for (const created of manifest.createdFiles) {
    const fullCreated = path.join(targetDir, created);
    if (fs.existsSync(fullCreated)) {
      fs.rmSync(fullCreated, { recursive: true, force: true });
    }
  }

  // 2. Restore backed up files
  for (const entry of manifest.backedUpFiles) {
    const backupSrc = path.join(manifestDir, entry);
    const restoreDest = path.join(targetDir, entry);
    if (fs.existsSync(backupSrc)) {
      if (fs.existsSync(restoreDest)) {
        fs.rmSync(restoreDest, { recursive: true, force: true });
      }
      copyRecursiveSync(backupSrc, restoreDest);
    }
  }

  if (!silent) {
    console.log(`\x1b[32m✔ Rollback completed successfully!\x1b[0m\n`);
  }
}

function copyRecursiveSync(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// -----------------------------------------------------------------------------
// 3. Document Templates (docs-document-schema.mdc 100% 準拠)
// -----------------------------------------------------------------------------
function generateStarterDocs(projectName: string, testFramework?: string): Record<string, string> {
  const today = new Date().toISOString().slice(0, 10);
  const testCmd = testFramework ? testFramework : 'npm test';

  return {
    'docs/needs/NEED-0001.md': `---
schema_version: 3
id: NEED-0001
kind: need
title: ${projectName} における要求・要件・仕様・テストのトレーサビリティ確立
status: accepted
created: "${today}"
updated: "${today}"
scope: local
depends_on: []
tags: [traceability, quality, v-model]
links: []
---
## Content

### Background
${projectName} の開発・保守において、機能追加やリファクタリング時に要求からテストまでの追跡関係が断片化し、変更影響範囲の特定やテスト不足が発生する課題を解決したい。

### Problem
仕様と実装・テストが個別に管理されることで、実装された振る舞いがどの要件を満たしているか、また重要な仕様に対して十分なテストが存在するかを客観的に証明・検証することが困難である。

### Desired Outcome
V字モデルに基づくトレーサビリティを Git 管理されたドキュメントで確立し、TraceWeave を通じて要件ごとの充足度とテスト地層密度を自動診断できるようにする。
`,

    'docs/actors/ACT-0001.md': `---
schema_version: 3
id: ACT-0001
kind: actor
title: システム利用者（エンドユーザーおよび開発者）
status: accepted
created: "${today}"
updated: "${today}"
scope: local
depends_on: []
tags: [actor, user]
links: []
---
## Content

### Role
${projectName} を操作・利用し、所定の機能的価値を享受する利用者、またはシステムの改修・保守を行う開発者。

### Responsibilities
システムに対する入力操作、機能の実行要求、および出力結果の確認・活用を行う。

### Interactions
CLI コマンド、API、または GUI を介してシステムにリクエストを送信し、処理結果またはレポートを受け取る。
`,

    'docs/usecases/UC-0001.md': `---
schema_version: 3
id: UC-0001
kind: use_case
title: 利用者がシステムの主要機能を実行し期待結果を得る
status: accepted
created: "${today}"
updated: "${today}"
scope: local
depends_on: []
tags: [use-case, primary-flow]
links: []
actor_refs: [ACT-0001]
requirement_refs: [REQ-0001]
---
## Content

### Goal
利用者が ${projectName} を正しく起動・実行し、期待される処理結果または成果物を安定して取得すること。

### Trigger
利用者または自動化システムからの実行コマンドあるいはリクエストの送信。

### Preconditions
システムが必要な動作環境要件を満たし、設定資材が配置されていること。

### Main Flow
1. 利用者が実行コマンドを入力する。
2. システムが入力を検証し、コアロジックを実行する。
3. 処理が正常に完了し、期待される結果が出力される。

### Alternative Flows
- 入力値が不正な場合: システムはエラーメッセージを表示し、非ゼロのステータスコードで終了する。

### Postconditions
処理結果が永続化または出力ストリームに返送され、システムが整合した状態を維持していること。
`,

    'docs/requirements/REQ-0001.md': `---
schema_version: 3
id: REQ-0001
kind: requirement
title: 主要ユースケースが定義通り実行可能でありテストで検証される
status: accepted
created: "${today}"
updated: "${today}"
scope: local
criticality: high
requirement_class: functional
depends_on: [NEED-0001]
tags: [core, execution, quality]
links: []
---
## Content

### Statement
${projectName} は、主要ユースケース（UC-0001）を正確に実行でき、その振る舞いが自動化テストによって検証されていること。

### Acceptance Criteria
- AC-001: Given 正常な入力パラメータが与えられたとき When システムを実行する Then 処理が成功し終了コード 0 が返ること
- AC-002: Given 不正な入力が与えられたとき When システムを実行する Then 適切なエラーメッセージが出力され非ゼロの終了コードが返ること
`,

    'docs/specifications/SPEC-0001.md': `---
schema_version: 3
id: SPEC-0001
kind: specification
title: システム実行インターフェースおよび入出力仕様
status: accepted
created: "${today}"
updated: "${today}"
scope: local
depends_on: [REQ-0001]
tags: [specification, interface, external, cli]
links: []
---
## Content

### Contract
システムは標準入力・引数または API リクエストを受け取り、処理結果を標準出力またはレスポンスオブジェクトとして返却する契約を満たす。

### Inputs
- 実行時引数または設定オブジェクト（必須／任意項目のバリデーション定義）

### Outputs
- 正常終了時の処理結果データまたはメッセージ
- 終了ステータスコード 0

### Errors
- 入力エラー時: エラー詳細メッセージおよび終了コード 1
- システム例外時: 診断用スタックトレースおよび非ゼロ終了コード

### Constraints
- 実行環境のタイムアウト上限内に同期・非同期処理を完了すること。
`,

    'docs/design/DSN-0001.md': `---
schema_version: 3
id: DSN-0001
kind: design
title: モジュール構造と処理フローアーキテクチャ設計
status: accepted
created: "${today}"
updated: "${today}"
scope: local
depends_on: [SPEC-0001]
tags: [design, architecture, module]
links: []
---
## Content

### Decision
関心の分離を徹底するため、インターフェース層（CLI/API）、アプリケーション層（ユースケース）、およびコアビジネスロジック層の階層化アーキテクチャを採用する。

### Structure
1. 入力受付層: 外部からのコマンド引数・環境変数をパースし、型付きリクエストオブジェクトに変換する。
2. アプリケーション層: バリデーションを行い、ドメインロジックまたは処理パイプラインを順次実行する。
3. 出力層: 処理結果を整形し、呼び出し元へ安全に出力する。

### Data Flow
入力リクエスト -> バリデーション -> コア処理実行 -> 結果オブジェクト生成 -> 外部出力

### Trade-offs
多層レイヤー構造の採用により小規模時のボイラープレートは若干増加するが、テスト容易性と将来的な拡張性が大幅に向上する。
`,

    'docs/decisions/ADR-0001.md': `---
schema_version: 3
id: ADR-0001
kind: decision
title: TraceWeave によるV字モデルトレーサビリティの導入
status: accepted
created: "${today}"
updated: "${today}"
scope: local
depends_on: []
tags: [decision, traceweave, traceability, architecture]
links: [DSN-0001]
---
## Content

### Context
${projectName} において、ドキュメントの形骸化を防ぎ、要件から設計・テストケースへの追跡性を Git ネイティブに維持・検証する仕組みが必要となった。

### Decision
TraceWeave をプロジェクトに導入し、\`docs/\` 配下の Markdown で V字モデルを管理するとともに、\`traceweave check\` による CI 自動検証を行う。

### Consequences
- 要件とテストケースのリンク関係が可視化され、テスト漏れや孤立した仕様を即座に検知できる。
- ドキュメントがコードと同様にレビュー・バリデーションの対象となり、常に最新の正本が維持される。
`,

    'docs/quality/QA-0001.md': `---
schema_version: 3
id: QA-0001
kind: quality_assurance
title: コア機能の信頼性と回帰防止に関する品質保証方針
status: accepted
created: "${today}"
updated: "${today}"
scope: local
depends_on: [REQ-0001]
tags: [quality, regression, testing]
links: []
---
## Content

### Objective
${projectName} の主要ユースケースおよび重要要件（REQ-0001）が、改修や依存関係更新後も常に安全に機能し続けることを保証する。

### Quality Criteria
- 重要度 High の要件に対して、単体テストおよび結合テストが網羅的に実装されていること。
- 全自動テストスイートがエラーなく決定論的に PASS すること。

### Verification
コミット時およびプルリクエスト時の CI パイプラインにおいて、自動テストスイートを実行し全件合格を検証する。

### Evidence
CI 実行ログにおけるテスト終了コード 0、およびテスト結果サマリーレポート。

### Exit Criteria
未解決の重大欠陥がゼロであり、テストカバレッジが目標水準を達成していること。
`,

    'docs/test-cases/TC-0001.md': `---
schema_version: 3
id: TC-0001
kind: test_case
title: コア機能の正常系実行と結果整合性の検証
status: accepted
created: "${today}"
updated: "${today}"
scope: local
depends_on: []
tags: [test, core, smoke]
links: []
test_level: unit
test_method: unit_contract
verifies: [REQ-0001, SPEC-0001]
---
## Content

### Objective
システムに正常なパラメータが渡された際、主要ロジックが期待通りに完了し正常終了することを確認する。

### Preconditions
テスト実行環境がセットアップされており、前提依存パッケージがインストールされていること。

### Steps
1. テストランナー（\`${testCmd}\`）からテストケースを実行する。
2. 正常系入力に対する戻り値および終了コードを検証する。

### Expected Results
テストランナーのアサーションが成功し、エラーなく終了すること。
`,

    'docs/SYSTEM_OVERVIEW.md': `# ${projectName} システム概要と境界定義書 (System Overview & Boundary)

本書は、\`${projectName}\` システムの存在目的、システム境界（In-Scope / Out-of-Scope）、および開発指示の分類基準を定義する正本である。

---

## 1. システムの目的 (Purpose)
${projectName} は、主要ユースケース（UC-0001）を実現し、安定した品質を提供する。

## 2. システム境界 (System Boundary)
- **In-Scope**: システムの実行時ロジック、入出力仕様、テストスイート。
- **Out-of-Scope**: リポジトリ構成、依存関係管理、開発プロセスツール。

## 3. ドキュメント体系
TraceWeave V字モデル（NEED -> REQ -> SPEC -> DSN, ACT, UC, QA, TC, ADR）に準拠して管理する。
`,
  };
}

function generateBinWrappers(): Record<string, string> {
  return {
    'bin/traceweave': `#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Try local traceweave package or fallback to global / sibling
if [[ -f "$ROOT/src/node_modules/.bin/traceweave" ]]; then
  exec "$ROOT/src/node_modules/.bin/traceweave" "$@"
elif [[ -f "$ROOT/node_modules/.bin/traceweave" ]]; then
  exec "$ROOT/node_modules/.bin/traceweave" "$@"
elif command -v traceweave >/dev/null 2>&1; then
  exec traceweave "$@"
else
  echo '{"ok":false,"error":"TraceWeave CLI not found. Please install traceweave globally or add to dependencies."}' >&2
  exit 1
fi
`,

    'bin/traceweave.cmd': `@echo off
setlocal
set "ROOT=%~dp0.."

if exist "%ROOT%\\src\\node_modules\\.bin\\traceweave.cmd" (
  call "%ROOT%\\src\\node_modules\\.bin\\traceweave.cmd" %*
  exit /b %ERRORLEVEL%
)
if exist "%ROOT%\\node_modules\\.bin\\traceweave.cmd" (
  call "%ROOT%\\node_modules\\.bin\\traceweave.cmd" %*
  exit /b %ERRORLEVEL%
)
where traceweave >nul 2>&1
if %ERRORLEVEL% equ 0 (
  traceweave %*
  exit /b %ERRORLEVEL%
)

echo {"ok":false,"error":"TraceWeave CLI not found. Please install traceweave globally or add to dependencies."} 1>&2
exit /b 1
`,

    'bin/traceweave.ps1': `$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir

$LocalSrcBin = Join-Path $Root "src/node_modules/.bin/traceweave.cmd"
$LocalRootBin = Join-Path $Root "node_modules/.bin/traceweave.cmd"

if (Test-Path $LocalSrcBin) {
    & $LocalSrcBin $args
    exit $LASTEXITCODE
}
if (Test-Path $LocalRootBin) {
    & $LocalRootBin $args
    exit $LASTEXITCODE
}
if (Get-Command traceweave -ErrorAction SilentlyContinue) {
    & traceweave $args
    exit $LASTEXITCODE
}

Write-Error '{"ok":false,"error":"TraceWeave CLI not found. Please install traceweave globally or add to dependencies."}'
exit 1
`,
  };
}

function generateCursorRules(): Record<string, string> {
  const schemaPath = path.join(TRACEWEAVE_ROOT, '.cursor', 'rules', 'docs-document-schema.mdc');
  const workflowPath = path.join(TRACEWEAVE_ROOT, '.cursor', 'rules', 'implementation-workflow.mdc');

  const schemaRule = fs.existsSync(schemaPath)
    ? fs.readFileSync(schemaPath, 'utf-8')
    : '# TraceWeave Documentation Schema\n';
  const workflowRule = fs.existsSync(workflowPath)
    ? fs.readFileSync(workflowPath, 'utf-8')
    : '# Implementation Workflow\n';

  return {
    '.cursor/rules/docs-document-schema.mdc': schemaRule,
    '.cursor/rules/implementation-workflow.mdc': workflowRule,
  };
}

// -----------------------------------------------------------------------------
// 4. Adoption Executor: 適用実行
// -----------------------------------------------------------------------------
export function adoptProject(options: AdoptionOptions = {}): {
  success: boolean;
  mode: AdoptionMode;
  targetDir: string;
  backupDir?: string;
  createdFiles: string[];
  probe: ProjectProbeResult;
} {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const mode = options.mode || 'overlay';
  const silent = options.silent || false;

  if (!silent) {
    console.log(`\n🚀 Initializing TraceWeave Adoption in "${targetDir}" [Mode: ${mode}]...`);
  }

  // 1. Probe target
  const probe = probeProject(targetDir);
  if (!silent) {
    console.log(`  - Project Name: ${probe.projectName}`);
    console.log(`  - Detected Languages: ${probe.languages.length > 0 ? probe.languages.join(', ') : 'None / Generic'}`);
    console.log(`  - Test Framework: ${probe.testFramework || 'Unknown / Not detected'}`);
    console.log(`  - Git Repository: ${probe.hasGit ? (probe.isGitDirty ? '⚠ Dirty tree (uncommitted changes)' : '✔ Clean') : 'Not a git repo'}`);
  }

  if (probe.isGitDirty && !options.force && mode === 'restructure') {
    throw new Error(
      'Git working directory has uncommitted changes. Please commit or stash changes before running full restructure, or use --force.'
    );
  }

  if (options.dryRun) {
    if (!silent) {
      console.log(`\n🔍 [DRY RUN] Plan for mode "${mode}":`);
      console.log(`  - Would backup existing assets to: ${options.backupDir || '.traceweave-backup/<timestamp>_' + mode}`);
      console.log(`  - Would create TraceWeave V-Model docs (docs/needs, docs/requirements, etc.)`);
      console.log(`  - Would install bin/traceweave wrappers`);
      console.log(`  - Would install .cursor/rules`);
      if (mode === 'restructure') {
        console.log(`  - Would migrate root source files to src/ and apply Clean-Root structure`);
      }
    }
    return {
      success: true,
      mode,
      targetDir,
      createdFiles: [],
      probe,
    };
  }

  // 2. Backup
  let backupDir: string | undefined;
  let manifest: BackupManifest | undefined;
  if (!options.noBackup) {
    const backupRes = createBackup(targetDir, mode, options.backupDir);
    backupDir = backupRes.backupDir;
    manifest = backupRes.manifest;
    if (!silent) {
      console.log(`\n📦 Safe backup created at: ${backupDir}`);
      console.log(`   (Backed up ${manifest.backedUpFiles.length} root entry/entries)`);
    }
  }

  const createdFiles: string[] = [];

  // Helper to write file and track
  const writeFileTracked = (relPath: string, content: string, chmodExec = false) => {
    const fullPath = path.join(targetDir, relPath);
    const existed = fs.existsSync(fullPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    if (chmodExec) {
      try {
        fs.chmodSync(fullPath, 0o755);
      } catch {
        // ignore chmod on windows
      }
    }
    if (!existed) {
      createdFiles.push(relPath);
    }
  };

  // 3. Generate Docs (V-Model Skeleton)
  const starterDocs = generateStarterDocs(options.projectName || probe.projectName, probe.testFramework);
  for (const [relPath, content] of Object.entries(starterDocs)) {
    // Only write if doesn't exist, to prevent clobbering existing docs
    const fullPath = path.join(targetDir, relPath);
    if (!fs.existsSync(fullPath)) {
      writeFileTracked(relPath, content);
    }
  }

  // 4. Generate Bin Wrappers
  const binWrappers = generateBinWrappers();
  for (const [relPath, content] of Object.entries(binWrappers)) {
    const isBash = relPath === 'bin/traceweave';
    writeFileTracked(relPath, content, isBash);
  }

  // 5. Generate Cursor Rules
  const cursorRules = generateCursorRules();
  for (const [relPath, content] of Object.entries(cursorRules)) {
    writeFileTracked(relPath, content);
  }

  // 6. Mode: Restructure (クリーンルート化)
  if (mode === 'restructure') {
    if (!silent) console.log('\n🧹 Performing full project restructuring (Clean Root)...');

    const srcDir = path.join(targetDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // Move package.json and tsconfig.json to src if they exist at root
    const rootPkg = path.join(targetDir, 'package.json');
    const srcPkg = path.join(srcDir, 'package.json');
    if (fs.existsSync(rootPkg) && !fs.existsSync(srcPkg)) {
      fs.renameSync(rootPkg, srcPkg);
      if (!silent) console.log('  - Moved package.json -> src/package.json');
    }

    const rootTsconfig = path.join(targetDir, 'tsconfig.json');
    const srcTsconfig = path.join(srcDir, 'tsconfig.json');
    if (fs.existsSync(rootTsconfig) && !fs.existsSync(srcTsconfig)) {
      fs.renameSync(rootTsconfig, srcTsconfig);
      if (!silent) console.log('  - Moved tsconfig.json -> src/tsconfig.json');
    }

    // Add .gitignore rules for clean root
    const gitignorePath = path.join(targetDir, '.gitignore');
    const ignoreRules = [
      '',
      '# TraceWeave & Clean Root',
      'src/node_modules/',
      'src/dist/',
      '.traceweave-backup/',
      '.cache/',
      'reports/test-results.json',
      '',
    ].join('\n');

    if (fs.existsSync(gitignorePath)) {
      const existing = fs.readFileSync(gitignorePath, 'utf-8');
      if (!existing.includes('src/node_modules/')) {
        fs.appendFileSync(gitignorePath, ignoreRules, 'utf-8');
      }
    } else {
      writeFileTracked('.gitignore', ignoreRules);
    }

    // Write DEVELOPER_GUIDE.md if missing
    const devGuidePath = path.join(targetDir, 'DEVELOPER_GUIDE.md');
    if (!fs.existsSync(devGuidePath)) {
      const guideContent = `# Developer Guide - ${probe.projectName}\n\nThis project follows the TraceWeave Clean-Root convention and Doc-First V-Model workflow.\n\n- Documents: \`docs/\`\n- Source & Dependencies: \`src/\`\n- CLI Wrapper: \`./bin/traceweave\`\n`;
      writeFileTracked('DEVELOPER_GUIDE.md', guideContent);
    }
  }

  // Update manifest with created files
  if (manifest && backupDir) {
    manifest.createdFiles = createdFiles;
    fs.writeFileSync(
      path.join(backupDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  if (!silent) {
    console.log(`\n\x1b[32m✔ TraceWeave successfully applied in [${mode}] mode!\x1b[0m`);
    console.log(`  - Files created: ${createdFiles.length}`);
    console.log(`  - To verify docs schema:  ./bin/traceweave check (or npx traceweave check)`);
    if (backupDir) {
      console.log(`  - To rollback if needed:   ./bin/traceweave adopt --rollback "${backupDir}"`);
    }
    console.log('');
  }

  return {
    success: true,
    mode,
    targetDir,
    backupDir,
    createdFiles,
    probe,
  };
}
