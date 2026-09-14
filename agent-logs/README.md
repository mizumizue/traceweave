# Agent Log（実行証跡）

Cursor Agent が**作業単位**ごとに残す実行証跡の保管場所。実装・改善・調査・文書起票など作業種別を問わず記録する。

## 証跡と正本の境界

| 保管場所 | 役割 | 読者への答え |
|----------|------|-------------|
| `docs/` | **正本** — 何であるべきか | REQ/SPEC/DSN がシステムの契約と設計を定義する |
| `agent-logs/` | **証跡** — いつ・何をして・どう確認したか | AL-* ログが作業の経緯と検証結果を記録する |

要件の内容は `docs/` を参照し、実装の経緯・判断・検証は `agent-logs/` を参照する。

## 人間向け：このフォルダの目的

後から読み返したときに、次が追えるようにする。

| 観点 | 記録セクション |
|------|----------------|
| 何のためのタスクか | `### Objective` |
| いつ完了とみなすか | `### Completion Criteria` |
| 何を触ったか（意味単位） | `### Changes` |
| **変更の結果、何がどうなるか** | `### Outcome` |
| この単位に含まれないもの | `### Deferred`（任意） |
| 何を改善したか | `### Improvements` |
| どう計測したか | `### Improvements` の How Measured、`### Verification` |
| 判断・フォローアップ | `### Notes` |
| どのコミットか | フロントマター `commit:` または `git log --grep <AL-ID>` |

### セクションの役割分担

| セクション | 読者への答え | 良い例 | 悪い例 |
|-----------|-------------|--------|--------|
| Objective | なぜやるか、何に向き合うか | 「TC 文書に実行結果が混在し、仕様と証跡が分離できなかった」 | 「DocParser を修正する」 |
| Changes | 意味単位ごとに何をどう変えたか | 状況・対応・狙いの 3 文セット | ファイル全件列挙 |
| Outcome | 変更後、利用者・運用・システムはどう変わるか | 「充足度スコアは実行合格のみ反映される」 | 「SufficiencyScorer.ts を修正した」 |
| Improvements | 何がどれだけ良くなったか（計測あり） | Before: 文書件数で加算 → After: passed のみ | Outcome の再掲 |
| Deferred | この作業単位のスコープ外は何か | 「UI 表示 → AL-20260914-005」 | 完了した作業の列挙 |
| Notes | なぜそうしたか、次に何をするか | 「パスD 相当のため REQ 起票を省略」 | Changes の再掲 |

### Objective の書き方（ストーリー重視）

**課題** と **対応** の 2 段落で書く。実装手順の列挙は Objective ではなく Changes に委譲する。

```markdown
### Objective

**課題:** TC 文書に実行結果が混在しており、仕様の正本と実行証跡が分離できていなかった。

**対応:** ADR-0006 に沿い、TC 文書は静的仕様のみ保持し、実行結果はテストレポートから取得する。
```

### Changes の書き方

ファイル全件列挙は `commit:` に委譲し、ログには **意味単位 3〜5 件** の Summary を書く。各 Summary は **状況・対応・狙い** を含む手厚い説明（2〜4 文）。

```markdown
### Changes

ファイル単位の一覧: `commit: eec5f50...`

| Area | Summary |
|------|---------|
| Parser / Loader | **状況:** TC 文書に実行結果が混在していた。**対応:** DocParser は仕様のみ保持、TestReportLoader はレポート生出力のみ結合。**狙い:** 仕様と実行証跡の正本を分離する。 |
```

- ファイル一覧・差分が欲しいとき → [コミット変更の閲覧](#コミット変更の閲覧)
- 意味が欲しいとき → Changes の Summary を読む

### Outcome の書き方

`### Changes` は「何をどう変えたか」、`### Outcome` は「その結果、人間にとって何が変わるか」。

- 良い例: 「`npm run lint` 実行時に fence-lite 規則違反が機械的に検出される」
- 悪い例: 「validate-docs.ts を修正した」（Changes の再掲）

### Deferred の書き方

大きな指示を複数コミットに分割したとき、**この単位に含まれない後続作業**を列挙する。

```markdown
### Deferred

- 実行合格ベースの充足度スコア → AL-20260914-004
- UI/レポート表示更新 → AL-20260914-005
```

該当がなければセクションごと省略する。

## フロントマター用語集

| フィールド | 意味 | 値の例 |
|-----------|------|--------|
| `id` | ログ一意 ID | `AL-20260914-003` |
| `task_type` | 作業種別 | `implementation`, `improvement`, `chore`, `docs`, `review`, `investigation` |
| `entrypoint` | 実装ワークフローの起点 | `path-a`（NEED）, `path-b`（REQ）, `path-c`（ADR）, `path-d`（直接実装）, `n/a` |
| `trigger` | 作業のきっかけ | ユーザー指示の要約、または `REQ-0002` 等 |
| `related` | 関連する正本文書 ID | `[REQ-0002, SPEC-0003, ADR-0006]` |
| `commit` | 対応コミットのハッシュ | `eec5f50...`（コミット直後に記録。任意だが推奨） |

`entrypoint` の詳細は `.cursor/rules/implementation-workflow.mdc` を参照。

## 分割作業の読み方

1 指示が複数コミットに分割された場合（例: AL-003 → AL-004 → AL-005）:

1. 各ログの `### Deferred` で後続作業を確認する
2. `related` フィールドで共通の REQ/SPEC/ADR をたどる
3. `git log --grep AL-20260914-003` 等でコミット系列を追う
4. レガシー集約ログ（`IL-*`）は概要のみ。詳細は分割後の `AL-*` を参照

## コミット変更の閲覧

Changes は意味単位の要約のみ。ファイル一覧と差分は Git で閲覧する。

### AL-ID から（推奨）

ログ ID だけ分かっているとき:

```bash
# 変更ファイル一覧（追加行数つき）
git show "$(git log --grep 'AL-20260914-003' -1 --format=%H)" --stat

# ファイル名のみ
git show "$(git log --grep 'AL-20260914-003' -1 --format=%H)" --name-only

# 全文 diff
git show "$(git log --grep 'AL-20260914-003' -1 --format=%H)"
```

### commit ハッシュから

ログ frontmatter の `commit:` が分かっているとき:

```bash
git show eec5f5003c8ccef91b82fada6a57a02e5176e4ae --stat
git show eec5f5003c8ccef91b82fada6a57a02e5176e4ae --name-only
git show eec5f5003c8ccef91b82fada6a57a02e5176e4ae
```

### 特定ファイルだけ

```bash
git show "$(git log --grep 'AL-20260914-003' -1 --format=%H)" -- src/infrastructure/parser/DocParser.ts
```

| 目的 | コマンド |
|------|----------|
| ざっと何が変わったか | `--stat` |
| ファイル名だけ欲しい | `--name-only` |
| 行単位の差分 | オプションなし（全文 diff） |
| 1 ファイルに絞る | 末尾に `-- <path>` |

### IDE で作業ツリーごと見る（checkout）

ターミナルの diff ではなく、IDE でファイルを開いて確認したいとき。**detached HEAD** で一時的に移動し、閲覧後に元のブランチへ戻す。

未コミットの変更がある場合は先に `git stash` するか、コミットしてから実行する。

**AL-ID から:**

```bash
# 移動（そのコミットの作業ツリーを IDE で開く）
git switch --detach "$(git log --grep 'AL-20260914-003' -1 --format=%H)"

# 戻る（直前のブランチへ）
git switch -
```

**commit ハッシュから:**

```bash
git switch --detach eec5f5003c8ccef91b82fada6a57a02e5176e4ae
git switch -
```

| 操作 | コマンド |
|------|----------|
| コミットへ移動 | `git switch --detach <hash>` |
| 直前のブランチへ戻る | `git switch -` |
| 戻り先が分からなくなった | `git switch main`（または元のブランチ名） |

- detached HEAD 上ではコミットしない（閲覧専用）。
- `git switch -` は「checkout 直前にいたブランチ」に戻る。別ブランチにいた場合はそのブランチへ戻る。

## 作業単位と Git の対応

**1 作業単位 = 1 ログファイル = 1 コミット**

| 方向 | 追跡方法 |
|------|----------|
| ログ → コミット | フロントマター `commit:` または `git log --grep AL-20260914-001 -1 --oneline` |
| コミット → ログ | 件名の `AL-*` ID、または本文 `Log: agent-logs/AL-....md` |
| コミットの変更内容 | [コミット変更の閲覧](#コミット変更の閲覧) |

コミット例:

```
AL-20260914-001: agent-logs 運用基盤と作業単位コミット連携

Log: agent-logs/AL-20260914-001.md

Agent が 1 作業単位 = 1 ログ = 1 コミットで証跡を残す運用を定義する。
```

## Agent 向け運用

- `.cursorignore` により Agent の通常コンテキストから除外される（**書き込み専用**）。
- スキーマと完了フローは `.cursor/rules/agent-logs.mdc` が正本。
- ファイル名: `AL-YYYYMMDD-NNN.md`（例: `AL-20260914-001.md`）。

## テンプレート

新規ログは `agent-logs/_TEMPLATE.md` をコピーして作成する。

## レガシー

`IL-*` 接頭辞のファイルは本運用開始前の改善ログ形式。新規は `AL-*` を使用する。
