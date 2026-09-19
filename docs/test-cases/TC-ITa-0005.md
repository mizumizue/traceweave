---
schema_version: 3
id: TC-ITa-0005
kind: test_case
title: 文書詳細とテスト実行結果の内部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
scope: local
test_level: integration_internal
test_method: scenario
verifies:
  - REQ-0006
  - REQ-0007
  - SPEC-0006
  - SPEC-0007
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
統合レポート生成が文書詳細セクションとテスト実行結果を同一ノードペイロードに内部結合することを検証する。

### Preconditions
実 `docs/` と（存在する場合）テスト実行レポートが利用可能であること。

### Steps
1. `buildTraceWeaveReport` を実 `docs/` 向けに実行し、`report.nodes` を取得する。
2. 代表要件 `REQ-0007` の `sections.Statement` の存在を確認する。
3. 代表テストケース `TC-UT-0001` の `sections.Objective` の存在を確認する。
4. テスト実行レポートに `TC-UT-0001` が passed の場合、当該ノードの `execution_status` が passed であることを確認する。

### Expected Results
- 要件・テストケースノードに Markdown 由来の詳細セクションが付与されていること。
- 実行レポートと整合する場合、合格テストの `execution_status` が passed となること。
