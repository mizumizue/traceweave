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
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---
## Content

### Objective

<このタスクの目的・背景>

### Completion Criteria

- [ ] <完了条件 1>
- [ ] <完了条件 2>

### Changes

| Path | Action | Summary |
|------|--------|---------|
| `<relative/path>` | added / modified / deleted | <変更概要> |

### Improvements

N/A

### Verification

```
<実行コマンド>  → <結果（exit code、pass/fail 件数など）>
```

### Notes

<判断理由、SubAgent ID、フォローアップ>
