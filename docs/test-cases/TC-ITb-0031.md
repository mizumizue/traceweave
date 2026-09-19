---
schema_version: 3
id: TC-ITb-0031
kind: test_case
title: CLI serve HTTP API の Newman による契約スモーク
status: accepted
created: '2026-09-19'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: api_contract
verifies:
  - SPEC-0004
  - SPEC-0008
depends_on: []
tags:
  - api
  - newman
  - serve
  - postman
links:
  - DSN-0023
parameter_file: fixtures/postman/traceweave-serve-api.postman_collection.json
---
## Content

### Objective
`traceweave serve` が公開する読み取り API と対話型テスト実行 API の基本契約を HTTP クライアントスイートで検証する。

### Preconditions
Web ダッシュボード用配布物がビルド済みであること。
HTTP スモーク用の Postman コレクションがワークスペースに登録されていること。

### Steps
1. ローカルで `serve` を起動し、`GET /api/data` を実行する。
2. テスト実行 API に未知のテストケース ID を送る。
3. テスト実行 API に UI 実行除外のテストケース ID（TC-ITb-0007）を送る。

### Expected Results
- `GET /api/data` は HTTP 200 で `subject` を含む JSON を返す。
- 未知 TC は HTTP 404 と `ERR_UNKNOWN_TEST_CASE` を返す。
- UI 実行除外 TC は HTTP 400 と `ERR_NOT_UI_EXECUTABLE` を返す。
