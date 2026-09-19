---
schema_version: 3
id: TC-ITa-0003
kind: test_case
title: TestCaseInputAnalyzer による UI 実行除外とレジストリ整合性検証
status: accepted
created: '2026-09-14'
updated: '2026-09-14'
scope: local
test_level: integration_internal
test_method: unit_contract
verifies:
  - REQ-0009
  - SPEC-0008
depends_on: []
tags:
  - input-analyzer
  - ui-executable
  - exclusion
links:
  - ADR-0003
  - DSN-0005
---
## Content

### Objective
`TestCaseInputAnalyzer` が外部環境依存テストを UI 実行対象外と判定し、`TestRunnerRegistry` が当該 ID を UI 実行可能として登録しないこと（TC-ITb-0007 等）を検証する。

### Preconditions
- `docs/test-cases/TC-ITb-0007.md` および `docs/test-cases/TC-ITb-0002.md` が存在すること。

### Steps
1. `DocParser` で TC-ITb-0007 と TC-ITb-0002 をパースし `ui_executable` を確認する。
2. `TestCaseInputAnalyzer.analyze` で除外理由コードを確認する。
3. `TestRunnerRegistry.isExecutable` が両 ID で `false` を返すことを確認する。

### Expected Results
- TC-ITb-0007: `ui_executable: false`、`reasonCode: external_environment_dependency`。
- TC-ITb-0002: `ui_executable: false`、同理由コード。
- `TestRunnerRegistry.isExecutable('TC-ITb-0007')` および `isExecutable('TC-ITb-0002')` が `false`。
