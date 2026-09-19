---
schema_version: 3
id: TC-ITa-0004
kind: test_case
title: トレーサビリティグラフの実ドキュメント内部結合探索検証
status: accepted
created: '2026-09-14'
updated: '2026-09-14'
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
DocParser と TraceGraph の内部結合で REQ-0001 依存連鎖を解決する。

### Preconditions
テストランナーが利用可能であること。

### Steps
1. 対象モジュールに入力を与え、契約どおりの出力を取得する。
2. 期待される属性・件数・状態を検査する。

### Expected Results
- 各検査項目が契約どおりに満たされること。
