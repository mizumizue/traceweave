---
schema_version: 3
id: TC-ITa-0004
kind: test_case
title: トレーサビリティグラフの実ドキュメント内部結合探索検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
scope: local
test_level: integration_internal
test_method: scenario
verifies:
  - REQ-0001
  - SPEC-0002
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
実文書ツリーをパースして構築したトレーサビリティグラフ上で、REQ-0001 の上流要求・下流仕様・検証テストケースが内部結合で解決されることを検証する。

### Preconditions
`DocParser` と `TraceGraph` が利用可能であること。

### Steps
1. 実 `docs/` ディレクトリを `DocParser.parseDirectory` で全ノード化し、`TraceGraph` に登録する。
2. `REQ-0001` ノードの存在を確認し、`getUpstream('REQ-0001')` で上流ノード一覧を取得する。
3. `getSpecsForRequirement('REQ-0001')` と `getAllTestCasesForRequirement('REQ-0001')` を実行する。

### Expected Results
- `REQ-0001` がグラフ上に存在すること。
- 上流に `NEED-0001` が含まれること。
- 紐づく仕様が 2 件以上、テストケースが 3 件以上解決されること。
