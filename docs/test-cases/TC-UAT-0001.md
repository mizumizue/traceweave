---
schema_version: 3
id: TC-UAT-0001
kind: test_case
title: 全工程を通じた TraceWeave 自己ドッグフーディング受入検証
status: accepted
created: '2026-09-12'
updated: '2026-09-19'
scope: local
test_level: acceptance
test_method: exploratory_manual
verifies:
  - REQ-0001
  - REQ-0002
  - REQ-0003
  - REQ-0004
  - REQ-0005
depends_on: []
tags:
  - test
  - acceptance
  - dogfooding
links:
  - UC-0001
  - UC-0002
---
## Content

### Objective
TraceWeave 自身の文書を入力として CLI と Web ダッシュボードを操作し、トレーサビリティマトリクスと工程地層が利用者視点で閲覧できることを受入確認する。

### Preconditions
CLI および Web 配布物がビルド済みであること。

### Steps
1. リポジトリルートから文書ガバナンス検証（lint）を実行し、自身の文書セットがエラーなく通過することを確認する。
2. 文書整合性検証コマンドとテスト証跡集約コマンドを実行し、終了コードとレポートが利用可能であることを確認する。
3. 静的ビルドおよびプレビューサーバーを起動し、ダッシュボードを表示する（ブラウザがある場合）。
4. マトリクスと工程地層表示を目視で確認する。

### Expected Results
- 文書ガバナンス検証が成功すること。
- 整合性検証と証跡集約が利用者が追える形で完了すること。
- ブラウザがある場合、自己トレーサビリティが確認できること（自動化スモークは **TC-ST-0003** が形式証跡を提供し、本 TC の手動・探索的ステップの代替ではない）。
