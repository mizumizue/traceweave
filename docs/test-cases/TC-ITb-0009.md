---
schema_version: 3
id: TC-ITb-0009
kind: test_case
title: ダッシュボード各率項目（全体充足度・High要件・マトリクス行・地層工程）の円グラフ統合観測テスト
status: accepted
created: '2026-09-12'
updated: '2026-09-12'
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
レポートデータにおいて、全体品質充足度、重要要件充足率、マトリクス行の充足度、各工程地層のカバー率がゲージ入力として欠損なく提供されることを検証する。ブラウザ上の SVG 描画は本ケースの対象外とする。

### Preconditions
- `buildTraceWeaveReport` によって生成された `TraceWeaveReport` が存在すること。

### Steps
1. `buildTraceWeaveReport()` を実行し、レポートデータを取得する。
2. ヘッダーの全体充足度・High要件充足率が 0〜100 の値であることを検証する。
3. マトリクスの全要件行のスコアが 0〜100 の範囲であることを検証する。
4. 全工程（unit, integration_internal, integration_external, system, acceptance）のカバー率が 0〜1 の範囲であることを検証する。

### Expected Results
- 全ての率表示項目において、ゲージに渡せる範囲内の値が欠損なく揃っていること。
