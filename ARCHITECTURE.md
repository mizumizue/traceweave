# TraceWeave アーキテクチャ設計書

本書は **TraceWeave** のアーキテクチャと技術仕様をまとめたものである。対象は、要求からテストまでの V 字トレーサビリティと、工程ごとのテスト密度の分析である。

---

## 1. アーキテクチャ設計原則

1. **Pure TypeScript Core (Zero External Dependencies)**:
   - ドメインロジック（グラフ探索、循環検知、スコアリング、ピラミッド診断）は外部ライブラリに依存しない純粋な TypeScript で実装する。
   - 単体テストはミリ秒で完了し、結果は決定論的（Deterministic）で保守しやすい。
2. **Ports & Adapters (ヘキサゴナルアーキテクチャ)**:
   - Application 層がユースケースをオーケストレーションし、Infrastructure（ファイル I/O、SQLite キャッシュ）と Entrypoints（CLI、React Web、MCP）を分離する。
3. **高速な静的出力 (Vite + React)**:
   - サーバーサイドレンダリング（Next.js 等）のランタイムを使わず、Vite による 1〜3 秒のバンドルを採用する。静的アセット（HTML/JS/CSS）として GitHub Pages や社内サーバーで共有できる。
4. **オプショナルな MCP 拡張**:
   - MCP サーバーは Core ロジックを呼び出す薄いアダプターとして独立配置し、特定の IDE（Cursor 等）への密結合を防ぐ。

---

## 2. システム構造図

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Entrypoints / Presentation                      │
│   CLI (Commander)  │  Web Dashboard (React)  │  MCP Server (Optional)  │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────────────┐
│                        Application (Use Cases)                         │
│  - checkDocs (CI用バリデーション)                                      │
│  - buildTraceWeaveReport (統合集計)                                    │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼──────────────────────────────────────┐
│                       Domain Core (純粋なロジック)                     │
│  - Models (Need, Req, Spec, TestCase, Phase, Method)                  │
│  - TraceGraph (有向グラフ構築, 循環検知, 孤立ノード検出)                │
│  - SufficiencyScorer (品質充足度計算)                                  │
│  - BalanceAnalyzer (工程の厚み・薄み・テストピラミッド健全性診断)       │
│  - MatrixBuilder (マトリクスおよび総合レポート構造化)                  │
└─────────────────────────────────▲──────────────────────────────────────┘
                                  │ (Ports & Adapters)
┌─────────────────────────────────┴──────────────────────────────────────┐
│                       Infrastructure (外部接続層)                      │
│  - DocParser (gray-matter による Markdown 解析)                        │
│  - DocMtimeCache (mtime 差分インデックス、JSON 永続化)                 │
│  - ConsoleReporter / MarkdownReporter (各種フォーマット出力)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. レイヤー構成と責務

| レイヤー | ディレクトリ | 主なクラス/モジュール | 責務 |
|---|---|---|---|
| **Core** | `src/core/` | `TraceGraph`, `SufficiencyScorer`, `BalanceAnalyzer`, `MatrixBuilder` | ビジネスルール、グラフ構造、スコアリング、地層診断。外部依存ゼロ。 |
| **Application** | `src/application/` | `checkDocs`, `buildTraceWeaveReport` | 業務ユースケースの実行・オーケストレーション。 |
| **Infrastructure** | `src/infrastructure/`| `DocParser`, `DocMtimeCache`, `ConsoleReporter`, `MarkdownReporter` | ファイルI/O、Markdownパース、mtime キャッシュ管理、フォーマット整形。 |
| **CLI** | `src/cli/` | `index.ts` | Commander.js によるコマンドライン受付（check, matrix, report, build, serve）。 |
| **Web** | `src/web/` | `index.html`, `vite.config.ts`, `App.tsx` | React 19 + Vite によるダッシュボード UI（開発資材は `src/web/` に収める）。 |
| **MCP** | `src/mcp/` | `server.ts` | Model Context Protocol による Cursor / AI エージェント連携。 |

---

## 4. リポジトリ構成とクリーンルート規約

lucid-memories のクリーンルート指針を参考に、TraceWeave ではリポジトリ構成を [ADR-0004](docs/decisions/ADR-0004.md)（Web 資材の `src/web/` カプセル化）および [ADR-0005](docs/decisions/ADR-0005.md)（`node_modules` / `dist` の `src/` 集約）で管理する。リポジトリルートには製品のガバナンス・全体構成マップ（`README.md`, `USER_GUIDE.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`）、除外設定（`.gitignore`）、実行用ラッパー（`bin/`）だけを置く。

`package.json`, `tsconfig.json`、依存パッケージ群（`node_modules/`）、ビルド成果物（`dist/`）を含む実装資産は `src/` 配下に収める（Web ダッシュボードの開発資材・成果物は `src/web/` 内）。ルート直下に個別の開発資材、ビルド成果物、依存キャッシュディレクトリは置かない。すべての CLI コマンドは `bin/traceweave` ラッパーが `NODE_PATH` を解決して透過実行する。
