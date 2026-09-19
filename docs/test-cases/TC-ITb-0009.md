---
schema_version: 3
id: TC-ITb-0009
kind: test_case
title: ダッシュボード各率項目（全体充足度・High要件・マトリクス行・地層工程）の円グラフ統合観測テスト
status: accepted
created: '2026-09-12'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: scenario
verifies:
  - REQ-0010
  - SPEC-0010
depends_on: []
tags:
  - integration
  - dashboard
  - circular-gauge
links: []
---
## Content

### Objective
ダッシュボード用集計 JSON に、全体品質充足度、重要要件充足率、マトリクス行スコア、各工程地層のカバー率がゲージ入力として欠損なく含まれることを検証する。ブラウザ上の SVG 描画は対象外とする。

### Preconditions
リポジトリの文書からダッシュボード用データをビルドできること。

### Steps
1. リポジトリルートでダッシュボード用データビルドを実行し、生成 JSON を取得する。
2. 全体充足度および High 要件充足率が 0〜100 の数値であることを確認する。
3. マトリクス各行のスコアが 0〜100 の範囲であることを確認する。
4. 全工程のカバー率が 0〜1 の範囲であることを確認する。

### Expected Results
- 全ての率表示項目において、ゲージに渡せる範囲内の値が欠損なく揃っていること。
