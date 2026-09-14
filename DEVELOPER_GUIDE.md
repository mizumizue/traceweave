# 開発者ガイド (Developer Guide)

本書は、**TraceWeave** の機能追加・修正・リファクタリングを行う開発者（人間および AI エージェント）向けの実装ガイドです。

このプロジェクトでは **lucid-memories** の設計指針に沿い、いきなりコードを書き始める「コードファースト」は避けます。指示の抽象度に応じた文書（要求または要件）を起点に精緻化・検証してから実装する**文書駆動開発（Doc-First / Spec-Driven）**と、**リポジトリルートのクリーン維持**を前提とします。

---

## 1. リポジトリ全体配置マップとクリーンルート規約

ルート直下には製品のガバナンス・決め事・全体構成マップを置き、実装コードや特定技術の設定資材は `src/` 配下に収めます。ルート直下に個別の開発資材（フロントエンド設定、HTML、CSS 設定、特定サブシステムのビルド設定など）を置いてはいけません。

```text
traceweave/
├── README.md               # 製品概要、全体構成マップ、クイックスタート
├── USER_GUIDE.md           # ユーザーガイド: CLI・Web 画面・MCP 連携
├── ARCHITECTURE.md         # アーキテクチャ設計原則、レイヤー責務、システム構造図
├── DEVELOPER_GUIDE.md      # 本ファイル: 開発者ガイド、文書先行プロセス、リポジトリ規約
├── .gitignore              # Git 除外設定（src/node_modules/, src/dist/, .cache/ 等）
│
├── docs/                   # 【製品の決め事】要求・要件・仕様・設計・ADR・品質・テスト
│   ├── needs/              # 要求定義 (NEED-*)
│   ├── requirements/       # 要件定義 (REQ-*)
│   ├── specifications/     # 詳細仕様 (SPEC-*)
│   ├── design/             # アーキテクチャ・詳細設計 (DSN-*)
│   ├── decisions/          # 意思決定ログ / ADR (ADR-*)
│   ├── actors/             # アクター定義 (ACT-*)
│   ├── usecases/           # ユースケース (UC-*)
│   ├── quality/            # 品質基準・検証方針 (QA-*)
│   └── test-cases/         # 個別テストケース (TC-*)
│
├── fixtures/               # テスト用静的フィクスチャ
├── scripts/                # 運用・検証スクリプト (validate-docs.ts, test.sh 等)
├── tests/                  # 単体・結合・E2E テストスイート
├── bin/                    # 【透過実行ラッパー】
│   ├── traceweave          # POSIX bash ラッパー
│   ├── traceweave.cmd      # Windows cmd ラッパー
│   └── traceweave.ps1      # Windows PowerShell ラッパー
│
└── src/                    # 【アプリケーション実装・依存・成果物】
    ├── package.json        # プロジェクト基盤メタデータ・依存関係・スクリプト
    ├── package-lock.json   # 依存関係ロックファイル
    ├── tsconfig.json       # TypeScript プロジェクト設定
    ├── node_modules/       # 依存パッケージ群（.gitignore 対象）
    ├── dist/               # コンパイル済み成果物（.gitignore 対象）
    ├── core/               # 純粋 TypeScript コア（外部依存ゼロ、ミリ秒テスト）
    ├── application/        # ユースケースオーケストレーション
    ├── infrastructure/     # ファイル I/O・SQLite キャッシュ・レポーター
    ├── cli/                # CLI コマンド受付（Commander.js）
    ├── mcp/                # Cursor / AI エージェント連携用 MCP サーバー
    └── web/                # 【Web ダッシュボード開発資材・UI】
        ├── index.html      # 起点 HTML
        ├── vite.config.ts  # Vite ビルド設定
        ├── tailwind.config.js # Tailwind CSS 設定
        ├── postcss.config.js  # PostCSS 設定
        ├── dist/           # Web ビルド成果物（.gitignore 対象）
        └── src/            # React 19 UI ソースコード（App.tsx, components/ 等）
```

---

## 2. 実装プロセスの全体フロー

機能追加・変更・改善は、次のステップで進めます。

```text
[開発タスク・機能要望]
        │
        ▼
【ステップ 1: 起点の判定 (Entrypoint Decision)】
  ・動機・課題・大まかな要望 ──> パスA: 要求起点 (docs/needs/)
  ・具体的成果・受入条件・契約 ──> パスB: 要件起点 (docs/requirements/)
        │
        ▼
【ステップ 2: 文書の起票と分解 (Authoring & Refinement)】
  ・パスA: NEED-xxxx.md を起票し、REQ-yyyy.md へ 1:N に分解
  ・パスB: REQ-xxxx.md を直接起票
  ・仕様 (SPEC-*)、設計 (DSN-*)、意思決定 (ADR-*) を作成
        │
        ▼
【ステップ 3: 検証ゲート (Validation Gate)】
  ・npm run lint (tsx scripts/validate-docs.ts) を実行し、スキーマ適合 (エラー0件) を確認
        │
        ▼
【ステップ 4: 実装とテスト (Implementation & Testing)】
  ・受入条件 (AC) に基づくテストコード作成 (tests/ 配下)
  ・src/ 配下のプロダクションコード実装 (Web 資材は src/web/ 内に集約)
  ・npm test による品質検証とリグレッション確認
```

---

## 3. 起点の判定 (Entrypoint Decision)

| 起点 | 指示の特徴 | 記録先ファイル | 依存関係 (`depends_on`) |
|---|---|---|---|
| **要求起点** (`need`) | 背景、動機、課題、大まかな要望（例:「〜したい」「〜で困っている」）、または複数成果に分解される抽象指示 | `docs/needs/NEED-xxxx.md` | `depends_on: []` |
| **要件起点** (`requirement`) | 観測可能な成果、具体的な振る舞い、受入条件（AC）など、単一の成果として閉じた具体的指示 | `docs/requirements/REQ-xxxx.md` | `depends_on: []`（要求から分解された場合は親 NEED を指定） |

---

## 4. 文書の起票ルールと検証ゲート

すべての文書は `docs-document-schema.mdc` に準拠して作成します。

- 必須見出し構成を守る（例: need は `Background`, `Problem`, `Desired Outcome`、requirement は `Statement`, `Acceptance Criteria`）。
- コミットやコード実装の着手前に次を実行し、エラーが 0 件であることを確認します。

```bash
./src/node_modules/.bin/tsx scripts/validate-docs.ts
```

---

## 5. テストケースの二軸モデル（工程層 vs 実行レイヤ）

`docs/test-cases/TC-xxxx.md` の `test_level` / `test_method` と、`tests/` 配下のテストファイル配置は**別の軸**です。混同すると、ピラミッド診断やカバレッジ集計を誤読します。

| 軸 | フィールド / 配置 | 意味 |
|---|---|---|
| **工程層（V 字モデル上の検証層）** | TC フロントマターの `test_level`（`unit` / `integration_internal` / `integration_external` / `system` / `acceptance`）および `test_method` | その TC が**どの工程・手法で要件を検証するか**を文書化する。ピラミッド健全性・地層密度の集計はこの軸を使う。 |
| **実行レイヤ（自動テストの実装配置）** | `tests/core/`, `tests/infrastructure/`, `tests/cli/`, `tests/web/` 等 | Node.js テストスイートの**技術的な実行単位**。同一 TC が `tests/core/` に置かれていても、検証対象が CLI 契約であれば `test_level: integration_external` と記述できます。 |

**運用ルール**

- TC 文書の `test_level` は「テストファイルのフォルダ名」ではなく「検証する工程」を表します。
- 自動テストの配置は `.cursor/rules/test-writing-guidelines.mdc` および `traceweave-test-fixture` スキルの判定マトリクスに従います。
- 合否は TC 文書に書かず、`reports/test-results.json`（ADR-0006）のみを正本とします。

---

## 6. テスト・ビルド・実行コマンド

```bash
# ドキュメントスキーマの検証
./src/node_modules/.bin/tsx scripts/validate-docs.ts

# 全テストの実行（Web ビルドおよび全テストスイート）
./scripts/test.sh
# または Windows: .\scripts\test.cmd

# CLI の実行（ルートから透過実行）
./bin/traceweave check
./bin/traceweave report
./bin/traceweave matrix
./bin/traceweave serve --port 3000

# src/ 配下での直接ビルド・テスト
npm --prefix src run build
npm --prefix src test
```
