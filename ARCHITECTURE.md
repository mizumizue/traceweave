# TraceWeave アーキテクチャ設計書

本書は、要求からテストまでのV字トレーサビリティと工程地層（厚み・薄み）の分析を提供する **TraceWeave** のアーキテクチャおよび技術仕様をまとめた文書である。

---

## 1. アーキテクチャ設計原則

1. **Pure TypeScript Core (Zero External Dependencies)**:
   - ドメインロジック（グラフ探索、循環検知、スコアリング、ピラミッド診断）は外部ライブラリに一切依存しない純粋な TypeScript で実装する。
   - 単体テストがミリ秒で完了し、決定性（Deterministic）と高保守性を担保する。
2. **Ports & Adapters (ヘキサゴナルアーキテクチャ)**:
   - Application 層がユースケースをオーケストレーションし、Infrastructure（ファイルI/O, SQLiteキャッシュ）および Entrypoints（CLI, React Web, MCP）を完全に分離する。
3. **超高速な静的出力 (Vite + React)**:
   - サーバーサイドレンダリング（Next.js 等）の重いランタイムオーバーヘッドを排除し、Vite による 1〜3 秒の爆速バンドルを採用。完全な静的アセット（HTML/JS/CSS）として GitHub Pages や社内サーバーで即時共有可能。
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
| **Web** | `src/web/` | `index.html`, `vite.config.ts`, `App.tsx` | React 19 + Vite によるインタラクティブなダッシュボードUI（開発資材を完全カプセル化）。 |
| **MCP** | `src/mcp/` | `server.ts` | Model Context Protocol による Cursor / AI エージェント連携。 |

---

## 4. リポジトリ構成とクリーンルート規約

lucid-memories のクリーンルート指針を参考に、TraceWeave ではリポジトリ構成を [ADR-0004](docs/decisions/ADR-0004.md)（Web 資材の `src/web/` カプセル化）および [ADR-0005](docs/decisions/ADR-0005.md)（`node_modules` / `dist` の `src/` 集約）で管理する。リポジトリルートには製品のガバナンス・全体構成マップ（`README.md`, `USER_GUIDE.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`）、除外設定（`.gitignore`）、および実行用ラッパー（`bin/`）のみを最前面に配置する。

`package.json`, `tsconfig.json`、依存パッケージ群（`node_modules/`）、およびビルド成果物（`dist/`）を含むすべての実装資産は `src/` 配下に完全カプセル化する（Web ダッシュボード開発資材・成果物は `src/web/` 内）。ルート直下に個別の開発資材、ビルド成果物、依存キャッシュディレクトリを一切露出させない。すべての CLI コマンドは `bin/traceweave` ラッパーが `NODE_PATH` を自動解決して透過実行する。
