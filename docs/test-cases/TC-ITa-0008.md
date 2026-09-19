---
schema_version: 3
id: TC-ITa-0008
kind: test_case
title: 実ドキュメントグラフレイアウトの内部結合検証
status: accepted
created: '2026-09-14'
updated: '2026-09-19'
scope: local
test_level: integration_internal
test_method: scenario
verifies:
  - REQ-0020
  - REQ-0021
  - REQ-0022
  - SPEC-0018
depends_on: []
tags:
  - strata
  - high-criticality
links: []
---
## Content

### Objective
実文書全体を入力としたトレーサビリティグラフ構築で、選択ノードのハイライトと種別除外が内部結合で決定論的に動作することを検証する。

### Preconditions
文書パースとトレーサビリティ可視化グラフ構築が利用可能であること。

### Steps
1. 実ドキュメントツリーをパースし、トレーサビリティグラフを構築する。
2. 選択ノード `REQ-0020` を指定して可視化グラフを生成する。
3. テストケース種別を除外するフィルターを指定して再度グラフを構築する。
4. 両結果のノード件数と `REQ-0020` のハイライト表示を比較する。

### Expected Results
- 種別除外なしのグラフのノード数が、テストケース除外時より多いこと。
- `REQ-0020` がハイライト対象として付与されていること。
