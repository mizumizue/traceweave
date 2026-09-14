---
schema_version: 1
id: AL-YYYYMMDD-NNN
kind: agent_log
title: <短いタスク名>
task_type: implementation
status: done
entrypoint: path-d
trigger: <ユーザー指示または REQ-xxxx / ADR-xxxx 等>
related: []
commit: ""
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---
## Content

### Objective

**課題:** <何が困っていたか。読者が「なるほど」と思える具体性>

**対応:** <何をどう向き合うか。実装手順の列挙ではなく方針>

### Completion Criteria

- [ ] <検証可能な完了条件 1>
- [ ] <検証可能な完了条件 2>

### Changes

ファイル単位の一覧: `commit: <hash>`（コミット後に記録）

```bash
git show "$(git log --grep 'AL-YYYYMMDD-NNN' -1 --format=%H)" --stat
git switch --detach "$(git log --grep 'AL-YYYYMMDD-NNN' -1 --format=%H)" && git switch -
```

| Area | Summary |
|------|---------|
| <意味単位 1> | **状況:** <変更前の問題>。**対応:** <何をしたか>。**狙い:** <なぜそうしたか・何が可能になるか>。 |
| <意味単位 2> | **状況:** …。**対応:** …。**狙い:** …。 |

### Outcome

<変更の結果、何がどうなるか。利用者・運用・システムの振る舞いの変化を 1〜3 文で。Changes の再掲は禁止。該当なしは N/A>

### Deferred

<この作業単位に含まれない後続作業。例: 「UI 表示更新 → AL-YYYYMMDD-NNN」。該当なしは本セクションごと削除>

### Improvements

N/A

<!-- 改善タスクの場合: Before / After / How Measured 表を記載。Outcome の再掲はしない -->

### Verification

```
<実行コマンド>  → <結果（exit code、pass/fail 件数など）>
```

### Notes

<判断理由、SubAgent ID、フォローアップ。Changes / Outcome の再掲はしない>
