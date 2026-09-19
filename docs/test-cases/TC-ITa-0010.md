---
schema_version: 3
id: TC-ITa-0010
kind: test_case
title: カタログ FR/NFR 群分割の内部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
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
統合レポートの要件ノード群が機能要件（FR）と非機能要件（NFR）に内部結合で分割され、区分ラベルが混入しないことを検証する。

### Preconditions
実 `docs/` から統合レポートを生成できること。

### Steps
1. `buildTraceWeaveReport` の `report.nodes` から `kind === 'requirement'` のみを抽出する。
2. `partitionByRequirementClass` を適用し、`functional` と `non_functional` 群を得る。
3. 各群の `requirement_class` フィールドを検査する。

### Expected Results
- 機能要件群が 20 件以上、非機能要件群が 2 件以上であること。
- 機能群の全ノードが `functional`、非機能群の全ノードが `non_functional` であること。
