# Agent Log（実行証跡）

Cursor Agent が**作業単位**ごとに残す実行証跡の保管場所。実装・改善・調査・文書起票など作業種別を問わず記録する。

## 証跡と正本の境界

| 保管場所 | 役割 | 読者への答え |
|----------|------|-------------|
| `docs/` | **正本** — 何であるべきか | REQ/SPEC/DSN がシステムの契約と設計を定義する |
| `agent-logs/` | **証跡** — いつ・何をして・どう確認したか | AL-* ログが作業の経緯と検証結果を記録する |

要件の内容は `docs/` を参照し、実装の経緯・判断・検証は `agent-logs/` を参照する。

## ログとコミットの結び方

**正本はコミットメッセージ先頭の `AL-YYYYMMDD-NNN`。** ログ frontmatter に Git OID（ハッシュ）を書かない。

| 方式 | 採用 | 理由 |
|------|------|------|
| コミット件名の AL-ID | **正本** | amend 後も `git log --grep` で常に最新コミットを解決できる |
| ログの `commit:` フィールド | **廃止**（レガシーは無視） | コミット後に追記すると amend で OID が変わり、必ず不整合になる |
| 作業単位ごとのブランチ | **任意** | PR・並行作業向け。追跡キーはブランチ名ではなく AL-ID |

### なぜハッシュ追記 + amend が壊れるか

1. ログと変更を 1 コミットに含める
2. `git log -1` で OID を取得し、ログの `commit:` に書く
3. ログを同じコミットに含めるため `git commit --amend`
4. **amend で OID が変わる** → 手順 2 の値は即座に古くなる

**コミット後にログへ OID を書き戻す作業はしない。**

### ブランチ（任意）

- **既定:** 現在のブランチ上で 1 作業単位 = 1 コミット。
- **PR 時:** `work/AL-YYYYMMDD-NNN-<短い説明>`。マージ後の追跡は件名の AL-ID のみで足りる。

## 人間向け：このフォルダの目的

| 観点 | 記録セクション |
|------|----------------|
| 何のためのタスクか | `### Objective` |
| いつ完了とみなすか | `### Completion Criteria` |
| 何を触ったか（意味単位） | `### Changes` |
| 変更の結果 | `### Outcome` |
| スコープ外 | `### Deferred`（任意） |
| 改善の計測 | `### Improvements` / `### Verification` |
| どのコミットか | `git log --grep '<AL-ID>' -1`（正本） |

## コミット変更の閲覧

```bash
git log --grep 'AL-20260914-003' -1 --oneline
git show "$(git log --grep 'AL-20260914-003' -1 --format=%H)" --stat
git switch --detach "$(git log --grep 'AL-20260914-003' -1 --format=%H)" && git switch -
```

レガシー frontmatter `commit:` は信用しない。上記を使う。

## 作業単位と Git の対応

**1 作業単位 = 1 ログファイル = 1 コミット**

| 方向 | 追跡方法 |
|------|----------|
| ログ → コミット | `git log --grep 'AL-YYYYMMDD-NNN' -1 --format=%H` |
| コミット → ログ | 件名の `AL-*`、または本文 `Log: agent-logs/AL-....md` |

## Agent 向け運用

- スキーマ正本: `.cursor/rules/agent-logs.mdc`
- テンプレート: `agent-logs/_TEMPLATE.md`
- **コミット後にログへ OID を追記しない**

## レガシー

- `IL-*` — 旧改善ログ形式
- frontmatter `commit:` — 廃止。残存値は無視する
