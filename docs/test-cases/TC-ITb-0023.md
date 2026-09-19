---
schema_version: 3
id: TC-ITb-0023
kind: test_case
title: トレーサビリティグラフのレイアウト・ハイライト・種別除外の外部結合検証
status: accepted
created: '2026-09-13'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: scenario
verifies:
  - REQ-0020
  - REQ-0021
  - REQ-0022
  - SPEC-0018
depends_on: []
tags:
  - integration
  - graph
links: []
---
## Content

### Objective
ダッシュボード用グラフデータが階層レイアウト、上流下流ハイライト、種別除外、インスペクター向けノード属性を満たすことを検証する。

### Preconditions
リポジトリの文書からダッシュボード用データをビルドできること。

### Steps
1. ダッシュボード用データビルドを実行し、グラフセクションを取得する。
2. ノードのランクと描画境界が妥当な範囲であることを確認する。
3. 代表ノードを選択し、上流・下流・全体のハイライトモードでハイライト集合が変化することを確認する。
4. テストケース種別を除外した再構築結果で、当該ノードとエッジのみが除かれることを確認する。
5. 選択ノードに ID、種別、タイトル、座標、ランクが含まれることを確認する。

### Expected Results
- レイアウトとエッジ接続が整合すること。
- ハイライトと減衰フラグが探索方向に沿うこと。
- 種別除外が他ノードの整合性を壊さないこと。
