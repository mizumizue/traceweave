---
schema_version: 3
id: TC-ITa-0010
kind: test_case
title: カタログ FR/NFR 群分割の内部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-14'
scope: local
test_level: integration_internal
test_method: scenario
verifies:
  - REQ-0028
  - SPEC-0022
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
要件が FR/NFR 群に内部結合で分割される。

### Preconditions
テストランナーが利用可能であること。

### Steps
1. 対象モジュールに入力を与え、契約どおりの出力を取得する。
2. 期待される属性・件数・状態を検査する。

### Expected Results
- 各検査項目が契約どおりに満たされること。
