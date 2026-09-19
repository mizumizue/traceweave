---
schema_version: 3
id: TC-ITb-0024
kind: test_case
title: CLI serve コマンドによるポート競合プロセスの自動終了と再起動の検証
status: accepted
created: '2026-09-13'
updated: '2026-09-13'
scope: local
test_level: integration_external
test_method: api_contract
verifies:
  - REQ-0005
  - SPEC-0004
depends_on: []
tags:
  - test
  - integration
  - cli
  - serve
links: []
---
## Content

### Objective
`traceweave serve` 実行時、指定ポートを既に専有している先行プロセスが存在する場合に、そのプロセスを自動的に終了させてポートを解放し、新規サーバーを正常に起動できることを検証する。

### Preconditions
Node.js ランタイム上で HTTP サーバーを任意ポートで事前に起動・専有できること。

### Steps
1. テスト用の空きポート（例: 3999）でダミーの HTTP サーバープロセスを先行起動し、ポートを専有させる。
2. ポート解放ユーティリティまたは CLI serve のポート競合処理を実行し、先行プロセスが終了されることを確認する。
3. 当該ポートで新規 HTTP サーバーが正常にリッスン可能になることを確認する。

### Expected Results
- 先行プロセスの PID が検知され、強制終了（kill）されること。
- 対象ポートが解放され、新規サーバーが正常に起動（リッスン）すること。
