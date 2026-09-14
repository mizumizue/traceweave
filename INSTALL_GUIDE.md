# TraceWeave インストール & 導入ガイド (Installation & Adoption Guide)

本書は、**TraceWeave**（トレースウィーブ）の動作環境要件、初期セットアップ、CLI コマンドおよび MCP 連携の有効化、ならびに**異なる構造を持つ外部プロジェクトへの導入・適用手順（一時適用／完全再構成）**を網羅した公式ガイドです。

---

## 1. 動作要件 (Prerequisites)

- **Node.js**: `v20.0.0` 以上（LTS 推奨）
- **npm**: `v10.0.0` 以上
- **対応 OS**: Linux / macOS / Windows (POSIX bash, cmd, PowerShell, WSL2)
- **Git**: `v2.30.0` 以上

---

## 2. TraceWeave 本体のセットアップ (Quick Setup)

リポジトリをクローンした後、`./bin/traceweave` を実行するだけで初回の依存関係インストールと Web ビルドが自動で行われます。

> 💡 **クリーンルート規約**: TraceWeave では `package.json` や `node_modules` がすべて `src/` 配下にカプセル化されています。通常は手動の `npm install` は不要です。

```bash
# 1. リポジトリのクローン
git clone https://github.com/your-org/traceweave.git
cd traceweave

# 2. 動作確認（初回は依存関係の自動インストールが走ります）
./bin/traceweave check

# 3. Web ダッシュボードの起動（初回は自動ビルドが走ります）
./bin/traceweave serve
```

Windows 環境（PowerShell / コマンドプロンプト）の場合は以下のように実行します：
```powershell
# PowerShell
.\bin\traceweave.ps1 check

# コマンドプロンプト (cmd)
.\bin\traceweave.cmd check
```

---

## 3. グローバル利用の設定 (CLI をどこからでも呼ぶ)

端末内のあらゆる作業ディレクトリから `traceweave` コマンドを実行できるようにするには、`npm link` を使用してグローバル登録します。

```bash
# src/ ディレクトリをグローバルリンク
cd src
npm link
cd ..

# 任意の場所から動作確認
traceweave --version
# => 0.1.0
```

---

## 4. AI エージェント連携（MCP サーバーの登録）

TraceWeave は **Model Context Protocol (MCP)** を標準サポートしています。Cursor や Claude Desktop 等の AI エージェントに登録することで、エージェントが自律的にトレーサビリティ分析や品質診断を実行できます。

### Cursor での設定 (`.cursor/mcp.json`)

プロジェクトまたはグローバルの `.cursor/mcp.json` に以下を追記します：

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

※ `traceweave` をグローバルリンクしている場合は以下のようにシンプルに記述できます：
```json
{
  "mcpServers": {
    "traceweave": {
      "command": "traceweave",
      "args": ["mcp", "-d", "./docs"]
    }
  }
}
```

---

## 5. 異種プロジェクトへの TraceWeave 導入 (Adoption Engine)

既存の別プロジェクト（構造や言語、ドキュメント配置が異なる任意のリポジトリ）に対して TraceWeave を導入するためのスクリプトおよび CLI コマンドが用意されています。

目的に応じて **「解析・一時適用モード」** と **「完全再構成モード」** の 2 つを選択できます。**破壊的な変更となる可能性があるため、実行前には必ず安全なバックアップが自動取得されます。**

### 導入モードの比較

| 項目 | ① 解析・一時適用モード (`overlay`) | ② 完全再構成モード (`restructure`) |
|---|---|---|
| **目的** | 既存プロジェクトを壊さず、最小限の工数でトレーサビリティを試用・分析したい | TraceWeave 標準のクリーンルート規約に沿って根本から再編したい |
| **既存コードの移動** | なし（既存構造を完全に温存） | あり（ルート直下の資材を `src/` 配下に整理・カプセル化） |
| **バックアップ対象** | 既存の `docs/`, `bin/`, 上書き対象ファイル | プロジェクト全体（`.git`, `node_modules` を除く全資産） |
| **生成資材** | `docs/` スケルトン、`bin/` ラッパー、`.cursor/rules/` | `docs/`、`bin/`、`src/` 集約、クリーン `.gitignore`、`DEVELOPER_GUIDE.md` |
| **推奨ユースケース** | 既存の商用プロダクト、モノレポ、まず品質診断を試したい場合 | 新規プロジェクト、またはクリーンアーキテクチャへ本格刷新したい場合 |

---

### 手順 A: 解析・一時適用モード (`--mode overlay`)

既存のプロジェクト構造を維持したまま、TraceWeave の V字モデル文書骨格（`docs/`）と実行ラッパー（`bin/`）をアドオンします。

```bash
# 1. 変更計画の事前確認（ドライラン）
./bin/traceweave adopt "/path/to/target-project" --mode overlay --dry-run

# 2. 適用実行（自動バックアップ付き）
./bin/traceweave adopt "/path/to/target-project" --mode overlay
```

#### 実行後の状態
- 対象プロジェクト直下に `docs/`（NEED, REQ, SPEC, DSN, ACT, UC, QA, TC, ADR）が配置されます。
- 対象プロジェクトの `bin/traceweave` ラッパーが配置され、対象ディレクトリ内で直接 `./bin/traceweave check` や `./bin/traceweave serve` が実行可能になります。
- 変更前の既存資産は `.traceweave-backup/<タイムスタンプ>_overlay/` に安全に退避されます。

---

### 手順 B: 完全再構成モード (`--mode restructure`)

対象プロジェクトを、TraceWeave が推奨するクリーンルート規約（ルート直下のガバナンス純化、`src/` 配下への実装カプセル化）へ完全に再編成します。

> ⚠️ **注意**: 本モードはファイルの移動を伴う破壊的変更です。未コミットの変更がある場合はエラーで停止します（`--force` で上書き可能ですが、コミット後の実行を強く推奨します）。

```bash
# 1. 変更計画の事前確認（ドライラン）
./bin/traceweave adopt "/path/to/target-project" --mode restructure --dry-run

# 2. 適用実行（プロジェクト全体のフルバックアップが作成されます）
./bin/traceweave adopt "/path/to/target-project" --mode restructure
```

#### 実行後の状態
- ルート直下の `package.json`, `tsconfig.json` 等が `src/` 配下へ移設され、ルートがクリーンに保たれます。
- ルート直下に `DEVELOPER_GUIDE.md`、`SYSTEM_OVERVIEW.md`、`bin/` ラッパーが配備されます。
- 完全バックアップが `.traceweave-backup/<タイムスタンプ>_restructure/` に保存されます。

---

### 手順 C: 万が一のためのロールバック (Rollback)

適用の結果を元に戻したい場合は、バックアップ時に自動生成された `backup-manifest.json` を指定してワンコマンドで完全復元できます。

```bash
# バックアップディレクトリを指定して復元
./bin/traceweave adopt "/path/to/target-project" --rollback "/path/to/target-project/.traceweave-backup/20260913083000_restructure"
```
復元処理により、TraceWeave によって新規作成されたファイルは安全に削除され、退避されていた元ファイルが元の位置へ復元されます。

---

## 5.5 品質セットアップ（adopt 品質キット）

`overlay` / `restructure` いずれの adopt でも、次が自動配備されます。

| 配備物 | 目的 |
|---|---|
| `docs/test-cases/TC-0001.md` / `TC-0002.md` | REQ-0001 AC-001 / AC-002 に対応するスターター TC |
| `docs/ADOPT_QUALITY_SETUP.md` | 導入後チェックリスト（TC 書き直し、レビュー、レポート、CI） |
| `scripts/traceweave-capture-test-report.mjs` | テスト名の `TC-xxxx` から `reports/test-results.json` を生成 |
| `.github/workflows/traceweave-governance.yml` | `traceweave check` + テスト + `--strict` |
| `.cursor/skills/traceweave-test-case-review/` | TC 意味監査スキル |
| `.cursor/rules/test-writing-guidelines.mdc` | テスト名 `TC-xxxx:` 命名規約 |

導入直後の確認:

```bash
./bin/traceweave check
./bin/traceweave adopt-quality-check
```

ボイラープレート TC やテストコード未整備に関する warning は想定内です。`docs/ADOPT_QUALITY_SETUP.md` に従い、プロジェクト固有の REQ/SPEC・テスト・CI へ仕上げてください。

---

## 6. Cursor スキルを使った自律導入 (`traceweave-adopt`)

Cursor AI エージェントを利用している場合、手動でコマンドを打つことなく、対話を通じて自然言語で適用できます。

### 実行例
AI エージェントに対して以下のように指示します：

> 「このプロジェクトに TraceWeave を解析・一時適用モードで導入して」  
> または  
> 「TraceWeave の推奨するクリーンルート構成に完全再構成して」

AI エージェントは `.cursor/skills/traceweave-adopt/SKILL.md` を自律的に読み込み、
1. **probe**: プロジェクト情報の収集・言語・テスト環境の診断
2. **checkpoint**: 事前バックアップの作成と整合性確認
3. **adopt**: 指定モードの安全な適用
4. **verify**: `./bin/traceweave check` によるスキーマ・リンク検査の合格確認

を決定論的な手順で実行します。

---

## 7. Cursor スキルのインストール (`traceweave-install-skills`)

TraceWeave 付属の Cursor スキル（文書監査、V字モデル起票、導入、テストレビュー等）は `.cursor/skills/` に同梱されています。本リポジトリ内では追加作業は不要です。

別マシンや外部プロジェクトへコピーする場合:

```bash
# 個人スキルへ配備（全ワークスペースで利用可能）
npm --prefix src run install-skills -- --target personal

# 外部プロジェクトへ配備（ルールも同梱）
npm --prefix src run install-skills -- --target project --project-dir "/path/to/target" --with-rules

# 変更内容の事前確認
npm --prefix src run install-skills -- --dry-run
```

シェルラッパー:

```bash
./.cursor/skills/traceweave-install-skills/scripts/install-skills.sh --target personal
```

### ドキュメント監査スキル (`traceweave-docs-audit`)

文書管理がルールに沿っているかを監査するスキルです。エージェントに次のように指示できます:

> 「ドキュメント管理を audit して」「V字モデル文書がルールに沿っているかチェックして」

監査は **sweep**（`npm --prefix src run lint` + `./bin/traceweave check`）と **fence-deep**（抽象度・境界の意味論チェック）の2段階で実行されます。

---

## 8. トラブルシューティング (Troubleshooting)

### Q. `./bin/traceweave check` で "Docs directory not found" と表示される
- 引数でドキュメントの場所を明示してください：
  `./bin/traceweave check -d ./docs`

### Q. 初回実行時に依存関係のインストールで失敗する
- Node.js v20 以上と npm が PATH 上にあることを確認してください。
- 手動で再試行する場合: `npm --prefix src install`

### Q. 完全再構成モードを実行しようとしたら "Git working directory has uncommitted changes" と怒られた
- 破壊的変更から作業中の差分を保護するための安全装置です。作業ツリーの変更をコミットまたは `git stash` してから再実行してください。検証目的などで強制実行したい場合は `--force` オプションを指定できます。
