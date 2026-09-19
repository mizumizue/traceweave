---
schema_version: 3
id: TC-ITa-0009
kind: test_case
title: レポート要件IDとURL状態の内部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
scope: local
test_level: integration_internal
test_method: scenario
verifies:
  - SPEC-0019
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
統合レポートに存在する要件 ID が URL クエリ状態（`nodeId`）のシリアライズ／パース往復で失われないことを検証する。ブラウザ History API の振る舞いは ITb-0015 / E2E が正本とする。

### Preconditions
実 `docs/` から統合レポートを生成できること。

### Steps
1. `buildTraceWeaveReport` を実行し、`REQ-0024` ノードの存在を確認する。
2. タブ・ビュー・ノード ID を含む URL 状態オブジェクトを `serializeUrlState` でクエリ文字列化する。
3. `parseUrlState` で復元し、`nodeId` を検査する。

### Expected Results
- `REQ-0024` がレポートノードに存在すること。
- 復元後の `nodeId` が `REQ-0024` と一致すること。
