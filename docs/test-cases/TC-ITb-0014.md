---
schema_version: 3
id: TC-ITb-0014
kind: test_case
title: トレーサビリティグラフデータ構築・階層レイアウトおよび上流下流トレースパスの検証
status: accepted
created: '2026-09-12'
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
ダッシュボード用集計 JSON に含まれるトレーサビリティグラフが、階層ランク・座標・上流下流ハイライト・種別除外を満たすことを検証する。ブラウザ操作は対象外とする。

### Preconditions
リポジトリの文書からダッシュボード用データをビルドできること。

### Steps
1. ダッシュボード用データビルドを実行し、グラフセクションのノードとエッジ一覧を取得する。
2. ノードの階層ランクがニーズからテストケース方向に単調増加することを確認する。
3. 代表ノードを選択したとき、上流・下流のハイライト集合が期待どおりであることを JSON 上で確認する。
4. 種別除外オプションを指定したとき、除外種別のノードと関連エッジが結果から除かれることを確認する。

### Expected Results
- 全ノードに有効な座標とランクが割り当てられ、NaN や無限大がないこと。
- 上流下流ハイライトが参照関係に沿って正しいこと。
- 循環参照があっても処理が完了すること。
- 種別除外が決定論的に適用されること。
