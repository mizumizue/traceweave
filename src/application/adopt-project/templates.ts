import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot } from '../../infrastructure/system/resolveRepoRoot.js';

// -----------------------------------------------------------------------------
// 3. Document Templates (docs-document-schema.mdc 100% 準拠)
// -----------------------------------------------------------------------------
export function generateStarterDocs(projectName: string, testFramework?: string): Record<string, string> {
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

export function generateBinWrappers(): Record<string, string> {
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

export function generateMcpConfig(): string {
  return JSON.stringify(
    {
      mcpServers: {
        traceweave: {
          command: 'traceweave',
          args: ['mcp', '-d', './docs'],
        },
      },
    },
    null,
    2
  );
}

export function generateCursorRules(): Record<string, string> {
  const repoRoot = resolveRepoRoot(import.meta.url);
  const schemaPath = path.join(repoRoot, '.cursor', 'rules', 'docs-document-schema.mdc');
  const workflowPath = path.join(repoRoot, '.cursor', 'rules', 'implementation-workflow.mdc');

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
