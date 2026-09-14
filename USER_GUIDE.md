# TraceWeave ユーザーガイド (User Guide)

> **V-Model Traceability Matrix & Test Stratum Sufficiency Analyzer**  
> 要求からテストまでの双方向トレーサビリティと、開発工程（単体・内結・外結・ST・UAT）および手法ごとの品質充足度・地層密度を可視化する品質保証プラットフォーム。

本書は、TraceWeave を使う開発者、QA エンジニア、プロジェクトマネージャー、および Cursor などの AI エージェントを使うエンジニア向けの利用マニュアルです。

---

## 目次

1. [TraceWeave の概要とコンセプト](#1-traceweave-の概要とコンセプト)
2. [クイックスタート](#2-クイックスタート)
3. [CLI コマンドリファレンス](#3-cli-コマンドリファレンス)
4. [MCP サーバー機能ガイド](#4-mcp-サーバー機能ガイド)
   - [4.1 MCP 連携の概要と目的](#41-mcp-連携の概要と目的)
   - [4.2 提供されている 4 つの MCP ツール](#42-提供されている-4-つの-mcp-ツール)
   - [4.3 Cursor でのセットアップ手順](#43-cursor-でのセットアップ手順)
   - [4.4 Claude Desktop でのセットアップ手順](#44-claude-desktop-でのセットアップ手順)
   - [4.5 AI エージェント活用シナリオ・プロンプト例](#45-ai-エージェント活用シナリオプロンプト例)
5. [Web ダッシュボードの使い方](#5-web-ダッシュボードの使い方)
6. [ドキュメント作成ガイド (docs/ の書き方)](#6-ドキュメント作成ガイド-docs-の書き方)
7. [CI/CD パイプライン連携](#7-cicd-パイプライン連携)
8. [トラブルシューティング & FAQ](#8-トラブルシューティング--faq)

---

## 1. TraceWeave の概要とコンセプト

TraceWeave は、追いにくくなりがちな**「要求からテストまでの追跡性（縦糸）」**と**「工程ごとのテスト密度の偏り（横糸）」**を、一目で把握できる品質保証ツールです。

### 解決する 3 つの課題

1. **要求〜テストの追跡断片化**:
   - スプレッドシートや複数のチケット管理ツールに分散した追跡関係を、Git 管理下の Markdown からグラフとして構築します。
2. **テスト充足度のブラックボックス化**:
   - コード網羅率（C0/C1）だけでなく、「どの業務要件や仕様契約が、どのテスト工程で検証されているか」を決定論的スコア（0〜100%）で可視化します。
3. **テストピラミッドの崩壊・空洞化**:
   - E2E テストへの偏り（アイスクリームコーン型）や、中間結合テストの欠落（ひょうたん型）といった不健全なテスト地層を検知して警告します。

---

## 2. クイックスタート

### 動作環境

- **Node.js**: v18.0.0 以上（v20 以上推奨）
- **npm**: v9.0.0 以上
- **OS**: macOS, Linux, Windows (PowerShell / cmd / WSL)

### インストールとビルド

TraceWeave のソースコードと依存関係は、クリーンルート規約に基づき `src/` 配下にあります。セットアップ・動作要件・外部プロジェクト導入の詳細は **[INSTALL_GUIDE.md](INSTALL_GUIDE.md)** を参照してください。

```bash
# 依存パッケージのインストール
npm --prefix src install

# ビルド（Core + Web ダッシュボード）
npm --prefix src run build

# テストスイートの実行
npm --prefix src test
```

### 透過実行ラッパー (`bin/traceweave`)

プロジェクトルートから直接コマンドを実行できるラッパースクリプトがあります。

- **macOS / Linux / Git Bash**: `./bin/traceweave <command>`
- **Windows コマンドプロンプト**: `.\bin\traceweave.cmd <command>`
- **Windows PowerShell**: `.\bin\traceweave.ps1 <command>`

---

## 3. CLI コマンドリファレンス

TraceWeave は、CI 向け検査からダッシュボード起動まで CLI で操作します。

### 3.1 `traceweave check` (ドキュメント健全性検査)

ドキュメントのスキーマ適合性、リンク切れ、多段循環参照、テストケースの充足度を検証します。CI パイプラインの品質ゲートに使えます。

```bash
# 基本チェック（警告は出力するが、致命的エラーのみ exit code 1）
./bin/traceweave check

# 厳格モード（未テスト要件や充足率不足の要件がある場合も exit code 1）
./bin/traceweave check --strict

# 対象 docs ディレクトリを指定
./bin/traceweave check --docs ./custom-docs
```

### 3.2 `traceweave matrix` (トレーサビリティマトリクス)

要求〜要件〜仕様〜テストケースの V 字トレーサビリティ表をコンソールまたはファイルに出力します。

```bash
# コンソールに対話型テキストマトリクスを表示
./bin/traceweave matrix

# CSV 形式でファイル出力（Excel やスプレッドシートへのインポート用）
./bin/traceweave matrix --format csv --out matrix.csv

# JSON / Markdown 形式で出力
./bin/traceweave matrix --format json --out matrix.json
./bin/traceweave matrix --format markdown --out matrix.md
```

### 3.3 `traceweave report` (品質充足度サマリーレポート)

全体充足率、重要要件のカバー率、5 大テスト工程の地層密度、ピラミッド診断のサマリーを出力します。

```bash
# コンソール出力
./bin/traceweave report

# Markdown 形式で出力（PR コメントやリリースノート向け）
./bin/traceweave report --format markdown --out quality-report.md
```

### 3.4 `traceweave catalog` (決め事カタログ探索)

アクター（ACT）、ユースケース（UC）、要件（REQ）、仕様（SPEC）、設計（DSN）、アーキテクチャ決定（ADR）、品質方針（QA）などの全ドキュメントを横断検索します。

```bash
# 全ドキュメント一覧の表示
./bin/traceweave catalog

# 種別でフィルタリング (actor, use_case, requirement, specification, design, decision, quality_assurance, need, test_case)
./bin/traceweave catalog --kind decision
./bin/traceweave catalog --kind actor

# タグまたはキーワードで検索
./bin/traceweave catalog --tag architecture
./bin/traceweave catalog --query "SQLite"
```

### 3.5 `traceweave decisions` (ADR & 設計仕様一覧)

アーキテクチャ意思決定記録（ADR）と詳細設計（DSN）の相互リンクに特化した一覧を表示します。

```bash
./bin/traceweave decisions
./bin/traceweave decisions --format json
```

### 3.6 `traceweave test-inputs` (テスト入力解析)

テストケースが外部パラメータファイルを持っており、Web 画面上で入力を変更・再実行できるかを判定します。

```bash
./bin/traceweave test-inputs
./bin/traceweave test-inputs --format markdown
```

### 3.7 `traceweave build` (静的 Web ダッシュボードの生成)

Vite + React による Web ダッシュボードに、解析済みのトレーサビリティデータを静的 JSON として埋め込み、配備用アセットをビルドします。

```bash
./bin/traceweave build
# 生成先: ./src/web/dist/ (index.html, assets, data.json)
```

### 3.8 `traceweave serve` (ローカル Web サーバー起動)

Web ダッシュボードをローカル HTTP サーバーで起動し、ブラウザで閲覧できるようにします。対話型テスト実行用 API（`/api/run-test`）も同時に提供します。

```bash
./bin/traceweave serve --port 3000
# ブラウザで http://localhost:3000/ にアクセス

# ポート競合時に先行プロセスを終了して再起動する場合
./bin/traceweave serve --port 3000 --restart
```

### 3.9 `traceweave adopt` (異種プロジェクトへの適用・移行)

既存の別プロジェクト（構造や言語が異なる任意のリポジトリ）に TraceWeave のトレーサビリティ基盤を導入します。
**変更前にバックアップが自動作成されます。**

```bash
# ① 解析・一時適用モード (overlay): 既存構造を維持し docs/ とラッパーを追加
./bin/traceweave adopt /path/to/project --mode overlay

# ② 完全再構成モード (restructure): クリーンルート規約に沿って資材を src/ へ再編
./bin/traceweave adopt /path/to/project --mode restructure

# 事前ドライラン（変更計画のプレビュー）
./bin/traceweave adopt /path/to/project --mode overlay --dry-run

# ロールバック（バックアップディレクトリから元通りに復元）
./bin/traceweave adopt /path/to/project --rollback /path/to/project/.traceweave-backup/20260913083000_overlay
```

詳細は **[INSTALL_GUIDE.md](INSTALL_GUIDE.md)** および Cursor スキル `traceweave-adopt` を参照してください。

---

## 4. MCP サーバー機能ガイド

### 4.1 MCP 連携の概要と目的

**Model Context Protocol (MCP)** は、AI エージェント（Cursor, Claude Desktop など）が外部のツールやコンテキストにアクセスするための標準仕様です。

`src/mcp/` は、**AI エージェントがプロジェクトの品質状態、要件トレーサビリティ、テスト不足、設計上の決定事項を照会できるようにする MCP サーバー**です。

#### なぜ MCP が必要なのか？

- 人間が「REQ-0005 のテストは十分か？」「結合テストが抜けている要件はあるか？」と質問したとき、AI がファイルを何十件も grep しなくても、**構造化された解析結果を 1 往復で取得**できます。
- AI エージェントが新規コードやテストを書く前・書いた後に、品質ギャップを検査できます。

---

### 4.2 提供されている 4 つの MCP ツール

TraceWeave MCP サーバーは、次の 4 つのツールを AI エージェントに公開します。

| ツール名 | 説明 | 主な入力引数 | 返却される主な情報 |
|---|---|---|---|
| **`get_traceability_summary`** | プロジェクト全体の概要サマリー | なし | 全体充足度スコア、各文書種別の総件数、重要要件のカバー率 |
| **`get_stratum_density`** | テストピラミッド診断 & 5 大工程密度 | なし | 単体/内結/外結/ST/UAT のテスト数と要件カバー率、ピラミッド判定（健全/逆コーン/空洞化） |
| **`get_requirement_status`** | 特定要件の個別トレース状態 | `requirementId` (例: `REQ-0001`) | 上流 NEED、下流 SPEC、紐づく全テストケース、工程内訳、充足率スコア |
| **`check_quality_gaps`** | 未テスト要件・結合テスト欠落の検出 | `strict` (boolean: true/false) | テストが全くない要件、結合テスト欠落要件、リンク切れ、循環参照 |

#### 各ツールの仕様詳細

#### ① `get_traceability_summary`

- **概要**: システム全体の品質状況を把握するための要約データを返します。
- **入力パラメータ**: なし
- **返却データ例**:
  ```json
  {
    "totalNeeds": 7,
    "totalRequirements": 25,
    "totalSpecifications": 20,
    "totalTestCases": 33,
    "overallSufficiencyScore": 88,
    "highCriticalityCoverage": 92,
    "fullySatisfiedRequirements": 22,
    "partiallySatisfiedRequirements": 3,
    "untestedRequirements": 0
  }
  ```

#### ② `get_stratum_density`

- **概要**: テストがどの工程（Unit, ITa, ITb, ST, UAT）に偏っているか、ピラミッドが健全かを返します。
- **入力パラメータ**: なし
- **返却データ例**:
  ```json
  {
    "strata": {
      "unit": { "testCount": 20, "coverageRatio": 0.8 },
      "integration_internal": { "testCount": 8, "coverageRatio": 0.4 },
      "integration_external": { "testCount": 4, "coverageRatio": 0.2 },
      "system": { "testCount": 1, "coverageRatio": 0.05 },
      "acceptance": { "testCount": 0, "coverageRatio": 0 }
    },
    "pyramid": {
      "status": "healthy_trophy",
      "warnings": [],
      "recommendations": ["結合テスト層が適切に配置されています。"]
    }
  }
  ```

#### ③ `get_requirement_status`

- **概要**: 特定の要件 ID を指定し、その要件の上流・下流トレースおよび充足度スコアを返します。
- **入力パラメータ**:
  - `requirementId` (文字列, 必須): 照会したい要件 ID（例: `"REQ-0001"`）
- **返却データ例**:
  ```json
  {
    "matrixRow": {
      "requirementId": "REQ-0001",
      "requirementTitle": "利用者がトレーサビリティマトリクスを閲覧できる",
      "criticality": "high",
      "needId": "NEED-0001",
      "specs": [{ "id": "SPEC-0001", "title": "..." }],
      "allTestCases": [
        { "id": "TC-0001", "level": "unit", "method": "unit_mock" },
        { "id": "TC-0026", "level": "integration_external", "method": "api_contract" }
      ],
      "score": 100
    },
    "sufficiency": {
      "requirementId": "REQ-0001",
      "score": 100,
      "isFullySatisfied": true,
      "coveredLevels": ["unit", "integration_external"]
    }
  }
  ```

#### ④ `check_quality_gaps`

- **概要**: 修正や追加が必要な品質ギャップを一覧します。
- **入力パラメータ**:
  - `strict` (真偽値, 任意): 厳格チェックを行うかどうか（デフォルト: `false`）
- **返却データ例**:
  ```json
  {
    "passed": true,
    "errors": [],
    "warnings": [],
    "gaps": {
      "untestedRequirements": [],
      "missingIntegrationTests": ["REQ-0012"],
      "missingDesignSpecs": []
    }
  }
  ```

---

### 4.3 Cursor でのセットアップ手順

Cursor から TraceWeave MCP サーバーを利用するには、プロジェクトの `.cursor/mcp.json` に設定を追加するか、Cursor の設定メニューから登録します。

#### `.cursor/mcp.json` の設定例

```json
{
  "mcpServers": {
    "traceweave": {
      "command": "node",
      "args": ["src/dist/cli/index.js", "mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

開発中（TypeScript 直接実行）の場合:

```json
{
  "mcpServers": {
    "traceweave": {
      "command": "node",
      "args": ["src/node_modules/tsx/dist/cli.mjs", "src/cli/index.ts", "mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

---

### 4.4 Claude Desktop でのセットアップ手順

Claude Desktop の設定ファイル（`claude_desktop_config.json`）に次のように追記します。

```json
{
  "mcpServers": {
    "traceweave": {
      "command": "node",
      "args": ["/絶対パス/traceweave/src/dist/cli/index.js", "mcp"],
      "cwd": "/絶対パス/traceweave"
    }
  }
}
```

---

### 4.5 AI エージェント活用シナリオ・プロンプト例

MCP サーバーを有効化すると、Cursor のチャット画面や Composer で次のように自然言語で指示できます。

#### シナリオ 1: 全体の品質健全性の確認

> **ユーザー**: 「現在のドキュメントとテストの全体充足率を教えて。」  
> **AI エージェント**: （`get_traceability_summary` ツールを実行し、充足率やドキュメント件数を回答）

#### シナリオ 2: 新機能実装前のギャップ調査

> **ユーザー**: 「いまテストが欠落している要件や、結合テストが足りない要件はある？」  
> **AI エージェント**: （`check_quality_gaps` ツールを実行し、未検証の要件リストを提示）

#### シナリオ 3: 特定要件のテスト設計

> **ユーザー**: 「REQ-0003 の充足度と、現在どのテストケースで検証されているか調べて。」  
> **AI エージェント**: （`get_requirement_status` に `requirementId: "REQ-0003"` を渡して実行し、紐づく SPEC や TC の内訳を回答）

#### シナリオ 4: テストピラミッドのバランス診断

> **ユーザー**: 「テストピラミッドが崩れていないか診断して。」  
> **AI エージェント**: （`get_stratum_density` ツールを実行し、単体〜E2E の比率と推奨アクションを報告）

---

## 5. Web ダッシュボードの使い方

Web ダッシュボードは、`./bin/traceweave serve`（ローカル起動）または `./bin/traceweave build`（静的 HTML 生成）で利用できます。

### 5.1 トレーサビリティマトリクス & 実測観測ビュー

- **円形ゲージ (Circular Gauge)**: 各要件の品質充足度を表示します（緑: 80% 以上充足 / 黄: 50〜79% 一部充足 / 赤: 50% 未満未充足）。
- **多軸フィルター**: 重要度（High / Medium / Low）、工程区分（UT, ITa, ITb, ST, UAT）、充足ステータス、フリーワードで絞り込み。
- **データエクスポート**: 絞り込んだ結果を CSV, JSON, Markdown 形式でダウンロード。

### 5.2 トレーサビリティグラフ (Graph View)

- 全ドキュメントをノード、依存関係を有向エッジとして階層レイアウトで描画します。
- ノードをクリックすると、そのノードの**上流（Upstream: なぜこの機能があるか）**と**下流（Downstream: どのテストで保証されているか）**の波及パスがハイライトされます。

### 5.3 工程地層密度 & VisualTestPyramid

- 5 大工程のテスト件数とカバー率をピラミッド状に立体表示します。
- アイスクリームコーン型（単体テストが少なく E2E テストばかり）や、中間空洞化（結合テストの欠落）を一目で見つけられます。

### 5.4 決め事カタログ (Decisions & Architecture)

- アクター、ユースケース、要件、仕様、詳細設計、意思決定（ADR）、品質保証をタブ横断で検索・詳細確認できます。

### 5.5 対話型テスト実行 (Interactive Test Runner)

- パラメータデータセット（`parameter_file`）が定義されたテストケースでは、画面上で数値を変更し、その場でテストを実行して合否と出力を確認できます。

---

## 6. ドキュメント作成ガイド (docs/ の書き方)

TraceWeave は、`docs/` 配下の Markdown ファイル（YAML フロントマター付き）を正本として解析します。

### 6.1 ディレクトリ構成と 9 つの文書種別

| ディレクトリ | 種別 (`kind`) | ID 接頭辞 | 役割 | 上流依存 (`depends_on`) |
|---|---|---|---|---|
| `docs/needs/` | `need` | `NEED-` | なぜやるのか（Why / 背景・課題・期待成果） | `[]` |
| `docs/actors/` | `actor` | `ACT-` | システムに関わる人・外部システム | `[]` |
| `docs/usecases/` | `use_case` | `UC-` | アクターとシステムの対話シナリオ | `[]` |
| `docs/requirements/` | `requirement` | `REQ-` | システムが何を満たすべきか（What / 受入条件） | `[NEED-xxxx]` または `[]` |
| `docs/specifications/` | `specification` | `SPEC-` | 入出力・型・プロトコル等の契約（Contract / ICD） | `[REQ-xxxx]` |
| `docs/design/` | `design` | `DSN-` | 内部構造・データフロー・選定理由（How） | `[SPEC-xxxx]` |
| `docs/decisions/` | `decision` | `ADR-` | アーキテクチャや構成管理の意思決定 | `[]` (links に DSN を指定可) |
| `docs/quality/` | `quality_assurance` | `QA-` | 品質特性・合否基準・検証方針 | `[REQ-xxxx]` または `[SPEC-xxxx]` |
| `docs/test-cases/` | `test_case` | `TC-` | 決定論的検証手順・期待結果・オラクル | `verifies: [REQ-..., SPEC-...]` |

### 6.2 重要度と充足度スコアリング基準 (Sufficiency Scoring)

要件（`REQ`）の `criticality` に応じて、必要なテスト工程と配点が決まります。

- **High (重要度: 高)**:
  - 単体テスト (`unit`): 30点
  - 内部結合 (`integration_internal`): 25点
  - 外部結合 (`integration_external`) または システム (`system`): 25点
  - 受入テスト (`acceptance`): 20点
  - **完全充足基準**: 合計 80 点以上（例: 単体 + 内結 + 外結 で達成可能）
- **Medium (重要度: 中)**:
  - 単体テスト (`unit`): 50点
  - 結合（内結/外結）または システム (`system`): 50点
  - **完全充足基準**: 80 点以上（単体 + 結合/ST で 100 点充足）
- **Low (重要度: 低)**:
  - いずれかのテスト工程が存在すれば 100点

---

## 7. CI/CD パイプライン連携

### GitHub Actions ワークフロー例 (`.github/workflows/traceweave.yml`)

```yaml
name: TraceWeave Quality Gate

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: 'src/package-lock.json'

      - name: Install dependencies
        run: npm --prefix src ci

      - name: Validate documentation schema
        run: npm --prefix src run lint

      - name: Run TraceWeave check
        run: ./bin/traceweave check --strict

      - name: Run test suite
        run: npm --prefix src test

      - name: Build static dashboard
        run: ./bin/traceweave build

      # 必要に応じて GitHub Pages へのデプロイステップを追加
```

---

## 8. トラブルシューティング & FAQ

### Q1. `bin/traceweave` が「Docs directory not found」エラーになる

- **原因**: 実行ディレクトリから `docs/` が見つからないか、指定パスが誤っています。
- **対処法**: リポジトリルートから実行するか、`--docs <dir>` オプションで正しいドキュメントパスを明示してください。

### Q2. MCP サーバーが Cursor で認識されない / 応答しない

- **原因 1**: `src/dist` がビルドされていない。
  - **解決策**: `npm --prefix src run build` を実行してトランスパイルしてください。
- **原因 2**: `.cursor/mcp.json` のパスが間違っている。
  - **解決策**: 相対パス `${workspaceFolder}/src/dist/cli/index.js` または絶対パスが正しいか確認してください。

### Q3. `traceweave check` で循環参照エラーが出る

- **原因**: A が B に依存し、B が A（またはその下流）に依存しているループが存在します。
- **解決策**: `check` のエラーメッセージに出力される循環パス（例: `SPEC-0001 -> DSN-0001 -> SPEC-0001`）を確認し、フロントマターの `depends_on` を修正してください。

### Q4. 品質充足度スコアが 100% にならない

- **原因**: 要件の `criticality` が `high` や `medium` の場合、単体テストだけではスコアが 30〜50% で止まります。
- **解決策**: 結合テスト（`integration_internal` / `integration_external`）またはシステムテスト（`system`）のテストケース（`TC-xxxx`）を追加し、`verifies: [REQ-xxxx]` を指定してください。
