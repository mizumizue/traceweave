---
schema_version: 3
id: TC-ITb-0007
kind: test_case
title: 対話型 API によるパラメータ化テストパターンの一括実行
status: accepted
created: '2026-09-12'
updated: '2026-09-19'
scope: local
verifies:
  - REQ-0008
  - SPEC-0008
depends_on: []
tags:
  - integration
  - data-driven
  - parameterized
links: []
test_level: integration_external
test_method: api_contract
criticality: high
parameter_file: fixtures/test-cases/TC-ITb-0007.json
---
## Content

### Objective
フロントマターで宣言したパラメータパターンを対話型テスト実行 API に投入し、各パターンの合否と実測値が期待と一致することを検証する。

### Preconditions
テスト実行エンドポイントが起動可能であること。

### Steps
1. テスト実行エンドポイントを起動する。
2. 本テストケース ID とパターン入力を含む実行要求を送信する。
3. 返却 JSON の合否と実測値を確認する。

### Expected Results
- 全パターンがエラーなく完了すること。
- 各パターンのステータスが `passed` であること。
