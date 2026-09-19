---
schema_version: 3
id: TC-ITb-0023
kind: test_case
title: トレーサビリティ有向グラフレイアウト計算・上流下流パス探索およびノード詳細インスペクター連動の外部結合テスト
status: accepted
created: '2026-09-13'
updated: '2026-09-13'
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
  - test
  - integration
  - graph
  - layout
  - highlight
  - inspector
  - upstream
  - downstream
links: []
---
## Content

### Objective
パース済みドキュメントノード群とトレーサビリティグラフから、階層ランク配置、座標、上流下流ハイライト、種別除外、およびインスペクターへ渡すノード情報を一体で検証する。

### Preconditions
`TraceGraph`, `TraceabilityGraphBuilder`, およびドキュメントノード群が利用可能であること。

### Steps
1. 実ドキュメント群から `TraceGraph` を構築し、`TraceabilityGraphBuilder.build(nodes, { traceGraph: graph })` を実行する。
2. 算出された描画ノード（`nodes`）の階層ランク（rank: 0〜4）および描画バウンディングボックス（`bounds`）が妥当な座標範囲を持つことを検査する。
3. 任意の要件ノード（例: REQ-0001）を選択（`selectedNodeId`）し、ハイライトモード（upstream, downstream, all）を切り替えて、到達可能ノード・エッジの `isHighlighted` および非関連ノードの `isDimmed` フラグを検査する。
4. 種別除外フィルター（`excludedKinds: ['test_case']`）を指定して再構築し、TC ノードおよび関連エッジのみが除外され、他ノードの整合性が維持されることを検査する。
5. 選択ノードの描画データがインスペクターへ渡せる公開契約（ID、種別、タイトル、座標、階層ランク）を満たすことを確認する。モーダル DOM の表示や全文・リンク欄の描画は対象外とする。

### Expected Results
- ステップ1および2で、全階層ノードが整然とレイアウトされ、エッジが正しく接続されること。
- ステップ3および4で、トレースパス探索および種別除外が正確に行われること。
- ステップ5で、選択ノードが ID、種別、タイトル、座標、階層ランクを保持すること。モーダル DOM の表示は判定対象に含めないこと。
