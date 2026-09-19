---
schema_version: 3
id: TC-ITb-0001
kind: test_case
title: 工程別テスト密度およびピラミッドアンチパターン診断の外部結合・シナリオ検証
status: accepted
created: '2026-09-12'
updated: '2026-09-13'
scope: local
test_level: integration_external
test_method: scenario
verifies:
  - REQ-0003
  - SPEC-0003
depends_on: []
tags:
  - test
  - integration
  - analyzer
  - parameterized
links: []
parameter_file: fixtures/test-cases/TC-ITb-0008.json
---
## Content

### Objective
`BalanceAnalyzer` が各工程のテストケース分布から地層密度（Heavy, Adequate, Thin, Missing）を判定し、クラシック・ピラミッド型（healthy）、健全トロフィー型（healthy_trophy）、逆ピラミッド（inverted_ice_cream）、中間空洞化（hollow_hourglass）、および不均衡・工程欠落（unbalanced）を正しく診断することを、外部パラメータセットと合成入力の両方で検証する。

### Preconditions
`BalanceAnalyzer` モジュールがロードされていること。

### Steps
1. 健全ピラミッド分布（UT: 60, ITa: 25, ITb: 10, ST: 8, UAT: 2）を入力して診断する。
2. 健全トロフィー分布（UT: 20, ITa: 35, ITb: 35, ST: 10, UAT: 5）を入力して診断する。
3. 逆ピラミッド分布（UT: 2件, ITa: 2件, ITb: 1件, ST: 10件, UAT: 25件）を合成入力して診断する。
4. 中間空洞化分布（UT: 10件, ITa: 0件, ITb: 0件, ST: 5件, UAT: 2件）を合成入力して診断する。
5. 結合偏重かつ工程欠落・不均衡分布（UT: 7件, ITa: 2件, ITb: 40件, ST: 0件, UAT: 5件）を入力して診断する。
6. `fixtures/test-cases/TC-ITb-0008.json` を読み込み、定義された各パターンを同じ診断処理へ渡す。

### Expected Results
- ステップ1で `healthy` と判定され、警告がないこと。
- ステップ2で `healthy_trophy` と判定され、警告がないこと。
- ステップ3で `inverted_ice_cream`（逆ピラミッド警告）が報告されること。
- ステップ4で `hollow_hourglass`（中間空洞化警告）が報告されること。
- ステップ5で `unbalanced`（不均衡・工程欠落警告）と判定され、ST欠落やUT不足の警告が報告されること。
- ステップ6で全パターンが期待ステータスと一致し、失敗が0件であること。
- unit のカバレッジ率が `1.0` で `heavy`、integration_external のカバレッジ率が `0.0` で `missing` と判定されること。
