# TraceWeave (トレースウィーブ)

> **V-Model Traceability Matrix & Test Stratum Sufficiency Analyzer**  
> 要求からテストまでの一貫した双方向トレーサビリティと、開発工程（単体・内結・外結・ST・UAT）×手法別の品質充足度・地層密度を可視化する品質保証プラットフォーム。

---

## スクリーンショット

Web ダッシュボード（`traceweave serve` / `traceweave build`）の代表画面。画像はリポジトリ内 [`docs/assets/screenshots/`](docs/assets/screenshots/) に配置しており、外部ホスティングは不要です。

### トレーサビリティマトリクス

要件ごとの品質充足度（円形ゲージ）と、NEED / SPEC / TC へのリンクを表形式で一覧表示。

![トレーサビリティマトリクス](./docs/assets/screenshots/matrix.png)

### トレーサビリティグラフ

V字モデル工程順のランク別レイアウトで、全ドキュメントの依存・検証関係をネットワーク可視化。

![トレーサビリティグラフ](./docs/assets/screenshots/graph.png)

### 工程地層密度 & テストピラミッド

5 大工程（UT / ITa / ITb / ST / UAT）のテスト量と要件カバー率を立体的に診断。

![工程地層密度とテストピラミッド](./docs/assets/screenshots/stratum.png)

### 決め事カタログ

アクター、ユースケース、要件、仕様、設計、ADR など全種別の決め事を横断探索。

![決め事カタログ](./docs/assets/screenshots/decisions.png)

### ギャップ & リスク

未テスト要件・結合テスト欠落など、品質ギャップの抽出結果。

![ギャップとリスク一覧](./docs/assets/screenshots/gaps.png)

---

## 1. 概要とコンセプト

TraceWeave は、現代のシステム開発において形骸化・ブラックボックス化しやすい「要求〜テストの追跡性」と「工程ごとのテスト密度の厚み・薄み」を一目で解読可能にするツールです。

- **縦糸（トレーサビリティ）**: 要求（NEED）→ 要件（REQ）→ 詳細仕様（SPEC）→ 設計（DSN）→ テストケース（TC）の双方向チェーンを Git ネイティブな Markdown から自動構築。
- **横糸（工程地層とテストピラミッド）**: テストを 5 大工程（単体・内結・外結・総合・受入）および各種手法（Mock、API Contract、Scenario、E2E等）に分類し、どの層が厚く・薄いか、結合テストの空洞化や E2E 過剰偏重が起きていないかを即時診断。
- **完全ドッグフーディング**: TraceWeave 自身も本スキーマに則って自己定義されており、自分自身のトレーサビリティと品質を TraceWeave ダッシュボードで可視化しています。

---



## 2. 特徴

1. **Git ネイティブ & ポータブル**:
  - `docs/` 配下の Markdown（YAML フロントマター）が唯一の正本（Single Source of Truth）。
  - 外部 DB サーバー不要。リポジトリ単体で完結し、CI や開発者の手元で即座に動作。
2. **高速・軽量・クリーンアーキテクチャ**:
  - Pure TypeScript Core（外部依存ゼロ）により、単体テストがミリ秒で実行。
  - `better-sqlite3` キャッシュにより、大量ドキュメントの差分パースも超高速。
  - **React + Vite** によるダッシュボード（ビルド時間 1〜3 秒、完全な静的アセット出力）。
3. **チーム開発 & CI/CD ファースト**:
  - `traceweave check` でプルリクエスト時にリンク切れ、循環参照、重要要件のテスト欠落を自動検知してガード。
  - `traceweave build` で生成される静的 HTML を GitHub Pages や社内サーバーに置くだけで、チーム全員（エンジニア・QA・PM）がブラウザで閲覧可能。
4. **オプショナルな MCP 拡張**:
  - Cursor などの AI エージェント連携は `traceweave mcp` という薄いサブコマンドとして分離。個人環境に密結合させません。
5. **クリーンなリポジトリ構造 & 完全カプセル化 (lucid-memories 指針)**:
  - ルート直下にはガバナンス・全体構成マップ・実行用ラッパー（`bin/`）のみを最前面に配置。
  - `node_modules`、`dist`、ビルド設定・依存関係（`package.json`, `tsconfig.json`）はすべて `src/` 配下に完全カプセル化。

---

## 3. リポジトリ全体配置マップ

```text
traceweave/
├── README.md               # 製品概要、全体構成マップ、クイックスタート
├── INSTALL_GUIDE.md        # インストール & 導入ガイド: 初期セットアップ・外部プロジェクト適用
├── USER_GUIDE.md           # ユーザーガイド: CLI・Web画面・MCP連携の完全利用マニュアル
├── ARCHITECTURE.md         # アーキテクチャ設計原則、レイヤー責務、システム構造図
├── DEVELOPER_GUIDE.md      # 開発者ガイド: 文書先行プロセスの流れ・リポジトリ規約
├── .gitignore              # Git 除外設定（src/node_modules/, src/dist/, .cache/ 等）
│
├── docs/                   # 【製品の決め事】要求・要件・仕様・設計・ADR・品質・テスト
├── fixtures/               # テスト用フィクスチャ
├── scripts/                # 運用・検証スクリプト (validate-docs.ts, test.sh 等)
├── tests/                  # テストスイート
├── bin/                    # 【透過実行ラッパースクリプト】
│   ├── traceweave          # POSIX bash ラッパー
│   ├── traceweave.cmd      # Windows cmd ラッパー
│   └── traceweave.ps1      # Windows PowerShell ラッパー
│
└── src/                    # 【アプリケーション実装・依存・成果物完全集約】
    ├── package.json        # 依存関係・スクリプト定義
    ├── tsconfig.json       # TypeScript 設定
    ├── node_modules/       # 依存パッケージ群（.gitignore 対象）
    ├── dist/               # コンパイル済み成果物（.gitignore 対象）
    ├── core/               # 純粋 TypeScript コア（外部依存ゼロ）
    ├── application/        # ユースケースオーケストレーション
    ├── infrastructure/     # ファイル I/O・SQLite キャッシュ・レポーター
    ├── cli/                # CLI コマンド受付（Commander.js）
    ├── mcp/                # Cursor / AI エージェント連携用 MCP サーバー
    └── web/                # Web ダッシュボード開発資材・UI
        ├── index.html
        ├── vite.config.ts
        ├── tailwind.config.js
        ├── postcss.config.js
        ├── dist/           # Web ビルド成果物（.gitignore 対象）
        └── src/            # React 19 UI ソースコード
```

---

## 4. クイックスタート

> 💡 **インストールと外部プロジェクト導入**: 前提要件、クローンからの初期セットアップ、グローバルリンク、および別プロジェクトへの適用手順（一時適用／完全再構成）については、**[INSTALL_GUIDE.md](INSTALL_GUIDE.md)** をご覧ください。  
> 💡 **詳細な利用ガイド**: CLI コマンドの全オプション、Web ダッシュボードの各ビューの解説、および Cursor / Claude Desktop 等の AI エージェントと連携する **MCP サーバーの設定・利用方法** については、**[USER_GUIDE.md](USER_GUIDE.md)** をご覧ください。

### CLI コマンドの利用

ラッパースクリプト（`bin/traceweave`）を使用することで、リポジトリルートから直接コマンドを実行できます。

```bash
# CI 用の静的チェック（不備があれば exit code 1）
./bin/traceweave check

# 外部プロジェクトへの TraceWeave 導入（解析一時適用 or 完全再構成）
./bin/traceweave adopt /path/to/project --mode overlay
./bin/traceweave adopt /path/to/project --mode restructure

# トレーサビリティマトリクスの表示
./bin/traceweave matrix

# アプリケーションの決め事カタログ（全種別の横断探索）
./bin/traceweave catalog
./bin/traceweave catalog --kind actor
./bin/traceweave catalog --kind decision

# アーキテクチャ意思決定（ADR）と設計（DSN）の相互リンク一覧
./bin/traceweave decisions

# 品質充足度および工程地層密度のサマリーレポート
./bin/traceweave report

# 静的 Web ダッシュボードのビルド（src/web/dist/ にアセット生成）
./bin/traceweave build

# ローカルプレビューサーバーの起動 (http://localhost:3000/)
./bin/traceweave serve --port 3000
```

### 開発・検証コマンド

```bash
# ドキュメントスキーマの検証
./src/node_modules/.bin/tsx scripts/validate-docs.ts

# 単体・結合・E2Eテストスイートの実行
./scripts/test.sh
# または Windows
.\scripts\test.cmd

# src/ 内での直接開発
npm --prefix src run build
npm --prefix src test
```
```

---



## 5. ドキュメントスキーマ

`docs/` 配下に以下のディレクトリを配置し、1ファイル1成果物の Markdown を作成します。


| ディレクトリ                 | 種別 (`kind`)         | ID 接頭辞      | 説明                                       |
| ---------------------- | ------------------- | ----------- | ---------------------------------------- |
| `docs/needs/`          | `need`              | `NEED-xxxx` | 背景・課題・期待する成果（Why）                        |
| `docs/requirements/`   | `requirement`       | `REQ-xxxx`  | 観測可能な成果・受入条件（What / AC）、区分（`requirement_class`: functional / non_functional）、重要度（criticality） |
| `docs/specifications/` | `specification`     | `SPEC-xxxx` | 入出力契約・インターフェース・異常系制約                     |
| `docs/design/`         | `design`            | `DSN-xxxx`  | モジュール構造・データフロー・トレードオフ                    |
| `docs/quality/`        | `quality_assurance` | `QA-xxxx`   | 品質基準・検証方針・完了判定                           |
| `docs/test-cases/`     | `test_case`         | `TC-xxxx`   | 個別検証手順、工程（test_level）、手法（test_method）    |
| `docs/decisions/`      | `decision`          | `ADR-xxxx`  | 設計・アーキテクチャの意思決定ログ                        |




### テストケースのフロントマター例

```yaml
---
schema_version: 3
id: TC-0001
kind: test_case
title: トレーサビリティグラフの多段循環参照検知テスト
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
test_level: unit                  # unit | integration_internal | integration_external | system | acceptance
test_method: unit_mock            # unit_mock | property_based | api_contract | scenario | e2e | etc.
verifies: [REQ-0001, SPEC-0002]   # 検証対象の要件・仕様ID
depends_on: []
tags: [core, graph]
links: []
---
## Content

### Objective
...
### Preconditions
...
### Steps
...
### Expected Results
...
### Evidence
...
```

---



## 5. 重要度と品質充足度の算出基準 (Sufficiency Scoring)

TraceWeave のダッシュボード（トレーサビリティマトリクス）やレポートで表示される各要件（REQ）行の**「重要度」**および**「品質充足度（Sufficiency Score）」**は、決定論的ロジック（`SufficiencyScorer`）に基づいて算出されます。

### 5.1 要件区分 (`requirement_class`)

要件ドキュメントのフロントマターで必須指定します。重要度とは独立した軸です。

- `functional`: 機能要件（FR）。システムが提供する観測可能な振る舞い・成果そのもの。
- `non_functional`: 非機能要件（NFR）。性能、保守性、識別性などの品質特性。

ダッシュボードのマトリクス・カタログ・詳細では `FR` / `NFR` として強調表示され、`reqclass` クエリで絞り込めます。

### 5.2 重要度 (`criticality`) の区分

要件ドキュメント（`docs/requirements/REQ-xxxx.md`）のフロントマターで指定します（省略時は `medium`）。

- `high`: システムの根幹・中核機能。単体テストから結合、受入に至る多層的な検証が必須。
- `medium`: 一般的な主要機能（デフォルト）。単体テストと結合/システムテストの組み合わせが必要。
- `low`: 補助的・周辺機能。いずれか1つのテスト工程があれば充足。



### 5.3 紐づくテストケースの自動集計

各要件（`REQ`）に対して、以下のテストケース（`TC`）が自動的に集計対象となります：

1. **直接検証**: `TC` の `verifies` に直接その `REQ` が指定されているテスト
2. **仕様（SPEC）経由**: その `REQ` に紐づく詳細仕様（`SPEC`）を検証しているテスト（`verifies: [SPEC-xxxx]`）



### 5.4 重要度別の配点基準と充足判定

集計されたテストケースの工程（`test_level`）の有無に基づき、0〜100% のスコアが算出されます。


| 重要度 (`criticality`) | 必須テスト工程と配点                                                                                                                                                           | 完全充足 (`isFullySatisfied`) の基準                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **High**            | ・単体テスト (`unit`): **30点** ・内部結合 (`integration_internal`): **25点** ・外部結合 (`integration_external`) または システム (`system`): **25点** ・受入テスト (`acceptance`): **20点** （合計100点） | **スコア 80% 以上** （例: 単体 + 内結 + 外結/ST で80点に達すれば完全充足） |
| **Medium**          | ・単体テスト (`unit`): **50点** ・結合（内/外）または システム (`system`): **50点** ※受入テストが存在する場合はボーナス +10点（上限100点）                                                                        | **スコア 80% 以上** （単体と結合/STの両方が揃えば100点充足）            |
| **Low**             | いずれか1つのテスト工程（単体、内結、外結、ST、受入）が存在すれば **100点**、なければ **0点**                                                                                                              | **スコア 100%**                                      |




### 5.4 ダッシュボードでのステータス表示

算出スコアに応じて、円グラフ（円形ゲージ）およびステータスラベルが3段階で色分け表示されます：

- **充足（緑 / Teal）**: **80% 以上**（各重要度における必須工程基準をクリアしている状態）
- **一部充足（黄 / Amber）**: **50% 以上 80% 未満**（単体テストはあるが結合・システムテストが欠落している等）
- **未充足（赤 / Rose）**: **50% 未満**（テストケース未作成、または High なのに単体テスト 30% のみ等）

### 5.5 Web ダッシュボードの主要ビュー

Web ダッシュボード（`traceweave serve` または `traceweave build` による静的 HTML）では、以下のビューをタブで切り替えて利用できます：

1. **トレーサビリティマトリクス & 実測観測**:
   - 表形式で要求〜要件〜仕様〜テストケースのV字トレーサビリティを一覧表示。
   - 円形ゲージによる品質充足度スコア表示、多軸フィルター、対話型テストランナー、CSV/JSONエクスポート。
2. **トレーサビリティグラフ (Graph View)**:
   - 全ドキュメントをノード、依存・検証関係を有向エッジとするインタラクティブなネットワークグラフ。
   - V字モデルの工程順序に応じたランク別階層レイアウト（Need → Actor/UseCase → Requirement → Spec/Design/ADR → QA/TestCase）。
   - スムーズなズーム・パン、全体表示フィット、種別フィルター、および特定ノード選択時の上流・下流トレースパス自動強調ハイライト。
3. **工程地層密度 & ピラミッド診断**:
   - 5大工程（UT, ITa, ITb, ST, UAT）のテスト量と要件カバー率を立体的に可視化する `VisualTestPyramid`。
   - 逆ピラミッド（アイスクリームコーン）や結合層空洞化（ひょうたん型）の早期検知。
4. **決め事カタログ (Architecture & Decisions)**:
   - アクター、ユースケース、要件、仕様、設計、意思決定（ADR）、品質保証など全種別の決め事を横断探索。
5. **ギャップ & リスク一覧**:
   - 未テスト要件、結合テスト欠落要件、未検証仕様の抽出。

---



## 6. ライセンス

MIT License