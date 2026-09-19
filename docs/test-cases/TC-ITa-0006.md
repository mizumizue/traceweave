---
schema_version: 3
id: TC-ITa-0006
kind: test_case
title: 工程地層ピラミッド比率の内部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
scope: local
test_level: integration_internal
test_method: scenario
verifies:
  - REQ-0014
  - SPEC-0014
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
統合レポートの工程地層データからピラミッド各層の構成比率が内部結合で算出されることを検証する。

### Preconditions
実 `docs/` から統合レポートを生成できること。

### Steps
1. 統合レポートから工程地層データを取得する。
2. ピラミッド 5 層の構成比率メトリクスを算出する。
3. 各層の構成比率（百分率）の合計を検査する。

### Expected Results
- メトリクス配列の長さが 5（全工程層）であること。
- 各層比率の合計が 99〜101% の範囲に収まること。
