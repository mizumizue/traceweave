---
schema_version: 3
id: TC-ITb-0027
kind: test_case
title: CLI catalog 要件区分統計の外部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: api_contract
verifies:
  - REQ-0026
  - REQ-0027
  - SPEC-0021
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
決め事カタログ CLI が JSON 形式で要件区分（機能・非機能）の件数統計を返すことを検証する。

### Preconditions
リポジトリに TraceWeave 文書ディレクトリが存在すること。

### Steps
1. リポジトリルートからカタログコマンドを JSON 形式で実行する。
2. 標準出力を JSON として解析し、`requirementClassCounts` を取得する。

### Expected Results
- `functional` が 20 以上、`non_functional` が 2 以上であること。
