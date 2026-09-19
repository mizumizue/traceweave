---
schema_version: 3
id: TC-ITb-0029
kind: test_case
title: MCP トレーサビリティ要約への subject 同梱
status: accepted
created: '2026-09-14'
updated: '2026-09-14'
scope: local
test_level: integration_external
test_method: api_contract
verifies:
  - REQ-0030
  - SPEC-0025
depends_on: []
tags:
  - subject-context
  - mcp
links: []
---
## Content

### Objective
MCP トレーサビリティ要約ツールの返却 JSON に `subject` が含まれることを検証する。

### Preconditions
有効な docs ディレクトリが存在すること。

### Steps
1. トレーサビリティ要約ツールを呼び出す。
2. 返却 JSON のルートに `subject` と `summary` が存在することを検査する。

### Expected Results
- `subject.displayName` が空文字でないこと。
- `summary.totalRequirements` が 0 より大きいこと。
