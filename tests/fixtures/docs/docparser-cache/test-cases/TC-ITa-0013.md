---
schema_version: 3
id: TC-ITa-0013
kind: test_case
title: キャッシュ連携テストケース
status: accepted
created: "2026-09-13"
updated: "2026-09-14"
scope: local
test_level: integration_internal
test_method: scenario
verifies: [REQ-0006, SPEC-0006]
depends_on: []
tags: [test, cache]
links: []
---
## Content

### Objective
パーサーとSQLiteキャッシュの詳細抽出を検証する。

### Preconditions
DB接続が正常であること。

### Steps
1. パースを実行する。
2. キャッシュを確認する。

### Expected Results
- データが完全であること。
