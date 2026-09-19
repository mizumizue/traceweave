---
schema_version: 3
id: TC-ITb-0017
kind: test_case
title: 静的Webダッシュボードビルド・レポート生成およびデータペイロード供給の外部結合テスト
status: accepted
created: '2026-09-13'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: scenario
verifies:
  - REQ-0004
  - SPEC-0005
depends_on: []
tags:
  - test
  - integration
  - dashboard
  - build
  - static
  - payload
links: []
---
## Content

### Objective
CLI のビルドコマンドにより静的ダッシュボード用の `data.json` と `index.html` を指定出力先へ生成できることを検証する。

### Preconditions
リポジトリに検証対象の文書が存在すること。

### Steps
1. リポジトリルートでレポート生成および静的ビルドを実行し、出力先ディレクトリを指定する。
2. 生成された JSON の summary、strata、pyramid、matrix、gaps、catalog セクションが存在することを確認する。
3. マトリクス配列の各行に要件タイトル、重要度、スコア、関連仕様が欠落なく含まれることを確認する。
4. 出力先に `data.json` と `index.html` が存在し、JSON がパース可能であることを確認する。

### Expected Results
- マトリクス行が完全に生成され、要件・仕様・テストの集約が欠落しないこと。
- 指定出力先に静的配布物が生成されること。
