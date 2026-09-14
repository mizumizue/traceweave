# Agent Log（実行証跡）

Cursor Agent が**作業単位**ごとに残す実行証跡の保管場所。実装・改善・調査・文書起票など作業種別を問わず記録する。

## 人間向け：このフォルダの目的

後から読み返したときに、次が追えるようにする。

| 観点 | 記録セクション |
|------|----------------|
| 何のためのタスクか | `### Objective` |
| いつ完了とみなすか | `### Completion Criteria` |
| 何を触ったか | `### Changes` |
| 何を改善したか | `### Improvements` |
| どう計測したか | `### Improvements` の How Measured、`### Verification` |
| どのコミットか | `git log --grep <AL-ID>`（下表） |

## 作業単位と Git の対応

**1 作業単位 = 1 ログファイル = 1 コミット**

| 方向 | 追跡方法 |
|------|----------|
| ログ → コミット | `git log --grep AL-20260914-001 -1 --oneline` |
| コミット → ログ | 件名の `AL-*` ID、または本文 `Log: agents-log/AL-....md` |

コミット例:

```
AL-20260914-001: agents-log 運用基盤と作業単位コミット連携

Log: agents-log/AL-20260914-001.md

Agent が 1 作業単位 = 1 ログ = 1 コミットで証跡を残す運用を定義する。
```

## Agent 向け運用

- `.cursorignore` により Agent の通常コンテキストから除外される（**書き込み専用**）。
- スキーマと完了フローは `.cursor/rules/agents-log.mdc` が正本。
- ファイル名: `AL-YYYYMMDD-NNN.md`（例: `AL-20260914-001.md`）。

## テンプレート

新規ログは `agents-log/_TEMPLATE.md` をコピーして作成する。

## レガシー

`IL-*` 接頭辞のファイルは本運用開始前の改善ログ形式。新規は `AL-*` を使用する。
