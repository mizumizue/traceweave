---
schema_version: 3
id: TC-ITb-0007
kind: test_case
title: 外部パラメータファイルからのデータ駆動テストバッチ実行テスト
status: accepted
created: '2026-09-12'
updated: '2026-09-12'
scope: local
verifies:
  - REQ-0008
  - SPEC-0008
depends_on: []
tags:
  - integration
  - data-driven
  - parameterized
  - test-runner
links: []
test_level: integration_external
test_method: scenario
criticality: high
parameter_file: fixtures/test-cases/TC-ITb-0007.json
---
## Content

### Objective
`TestRunnerRegistry` が外部ファイル `fixtures/test-cases/TC-ITb-0007.json` から複数パターンのテストデータ（正常系、境界値、異常値）を読み込み、同一のテストロジックに対して一括ループ実行し、実測値・期待値の合否を正確に判定できることを検証する。

### Preconditions
- `fixtures/test-cases/TC-ITb-0007.json` が配置されており、5パターンの入力セットが定義されていること。

### Steps
1. `fixtures/test-cases/TC-ITb-0007.json` を JSON データセットとして読み込む。
2. `TestRunnerRegistry.runDataset()` にデータセットを渡し、全パターンを実行する。
3. 全パターンの実測結果が期待値と合致し、`passed` となることをアサートする。

### Expected Results
- 全パターンの実行がエラーなく完了すること。
- 各パターンの `status` が `'passed'` であること。
- 不一致パターンを注入した場合は即座に `'failed'` と判定されること。
