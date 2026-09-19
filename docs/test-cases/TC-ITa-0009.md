---
schema_version: 3
id: TC-ITa-0009
kind: test_case
title: レポート要件IDとURL状態の内部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-14'
scope: local
test_level: integration_internal
test_method: scenario
verifies:
  - REQ-0023
  - REQ-0024
  - SPEC-0019
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
実レポート要件 ID が URL 状態と内部結合で整合する。

### Preconditions
テストランナーが利用可能であること。

### Steps
1. 対象モジュールに入力を与え、契約どおりの出力を取得する。
2. 期待される属性・件数・状態を検査する。

### Expected Results
- 各検査項目が契約どおりに満たされること。
