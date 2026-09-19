---
schema_version: 3
id: TC-ITb-0015
kind: test_case
title: WebダッシュボードURL状態および履歴更新分類の契約テスト
status: accepted
created: '2026-09-12'
updated: '2026-09-12'
scope: local
test_level: integration_external
test_method: scenario
verifies:
  - REQ-0023
  - REQ-0024
  - SPEC-0019
depends_on: []
tags:
  - web
  - history-api
  - url-state
  - navigation
  - routing
links: []
---
## Content

### Objective
Web ダッシュボードの URL 状態パース、シリアライズ、および履歴更新分類の決定論的契約を検証する。実ブラウザの戻る・進む操作と共有ボタンはブラウザ E2E の対象外とする。

### Preconditions
1. クエリパラメータのパースおよびシリアライズを行う公開 URL 状態契約が提供されていること。
2. URL 状態と検索条件変更の履歴更新分類を返す公開契約が利用可能であること。

### Steps
1. 各種クエリ文字列（正常値、異常値、デフォルト値混在、欠損パターン）を URL 状態パーサーに投入し、解析結果およびフォールバック動作を検証する。
2. アプリケーション状態オブジェクトを `serializeUrlState` に投入し、不要なデフォルト値が適切に省略されたクリーンなクエリ文字列が生成されることを検証する。
3. 検索文字列だけが変化した状態が履歴置換対象として分類され、他の状態変更は分類されないことを検証する。

### Expected Results
1. クエリパラメータ（`tab`, `node`, `q`, `phase`, `criticality`, `score`, `kind`, `tag`, `status`, `highlight`）が仕様通り相互変換されること。
2. 不正な値（不正なタブ名や重要度等）が渡された場合、デフォルト値に安全にフォールバックすること。
3. 状態分類が決定論的であり、検索以外の変更を誤って置換対象にしないこと。
