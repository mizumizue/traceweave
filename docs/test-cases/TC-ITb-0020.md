---
schema_version: 3
id: TC-ITb-0020
kind: test_case
title: Web UIコンポーネント間連携（モーダル履歴・立体ピラミッド連動・フィルターエクスポート）の外部結合テスト
status: accepted
created: '2026-09-13'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: scenario
verifies:
  - REQ-0013
  - REQ-0014
  - REQ-0015
  - SPEC-0013
  - SPEC-0014
  - SPEC-0015
depends_on: []
tags:
  - test
  - integration
  - web
  - modal
  - pyramid
  - filter
  - export
links: []
---
## Content

### Objective
Web ダッシュボードのモーダル履歴、工程選択、マトリクスフィルター、エクスポートの公開契約が同じレポートデータで連携することを検証する。DOM 描画とブラウザ操作の形式証跡は **TC-ST-0003** に委ね、`tests/support/web-contract/` は補助ハーネス（証跡非マージ）とする。

### Preconditions
レポートデータと公開された UI 契約関数が利用可能であること。

### Steps
1. 公開されたモーダル履歴契約でノード遷移と戻る操作を検証する。
2. 工程選択契約とマトリクスフィルターを同じレポートデータへ適用する。
3. フィルター結果の CSV / JSON エクスポート契約を検証する。

### Expected Results
- ステップ1〜3を通じて、履歴、工程フィルター、エクスポートのデータ契約が一貫して成立すること。
