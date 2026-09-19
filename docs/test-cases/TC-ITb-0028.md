---
schema_version: 3
id: TC-ITb-0028
kind: test_case
title: Web data.json 要件区分メタデータの外部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: scenario
verifies:
  - REQ-0028
  - SPEC-0022
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
Web ダッシュボード用ビルド成果物に要件区分メタデータとカタログ統計が含まれることを検証する。

### Preconditions
ダッシュボード用データのビルドが完了し、配布用 JSON が生成されていること。

### Steps
1. 生成済みダッシュボードデータ JSON を読み込む。
2. 代表非機能要件 `REQ-0028` の要件区分を確認する。
3. 埋め込みカタログの機能要件件数を確認する。

### Expected Results
- `REQ-0028` の区分が `non_functional` であること。
- 機能要件カウントが 20 以上であること。
