---
schema_version: 3
id: TC-ITa-0007
kind: test_case
title: 実ドキュメントカタログ統計の内部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
scope: local
test_level: integration_internal
test_method: scenario
verifies:
  - REQ-0017
  - REQ-0018
  - REQ-0019
  - SPEC-0017
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
統合レポートに埋め込まれる決め事カタログの件数・種別統計・要件区分統計が文書ノード総数と内部結合で整合することを検証する。

### Preconditions
実 `docs/` から統合レポートを生成できること。

### Steps
1. `buildTraceWeaveReport` を実行し、`report.catalog` と `report.nodes` を取得する。
2. `catalog.totalCount` と `nodes.length` の一致を確認する。
3. `kindCounts.requirement` および `requirementClassCounts`（機能・非機能・未区分）の合計が要件件数以上であることを確認する。

### Expected Results
- カタログ総件数がパース済み全ノード件数と一致すること。
- 要件種別件数が 20 件以上であること。
- 要件区分カウントの合計が要件種別件数を下回らないこと。
