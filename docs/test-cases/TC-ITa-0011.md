---
schema_version: 3
id: TC-ITa-0011
kind: test_case
title: TraceWeaveReport とレポート出力への subject 同梱
status: accepted
created: '2026-09-14'
updated: '2026-09-14'
scope: local
test_level: integration_internal
test_method: api_contract
verifies:
  - REQ-0030
  - SPEC-0025
depends_on: []
tags:
  - subject-context
  - report
  - markdown
links: []
---
## Content

### Objective
レポート生成結果に `subject` が含まれ、マークダウン出力先頭に対象アプリケーション名が反映されることを検証する。

### Preconditions
有効な docs ディレクトリが存在すること。

### Steps
1. レポート統合関数を実行し、返却 JSON の `subject` を検査する。
2. マークダウンレポーターで出力し、先頭見出しを検査する。

### Expected Results
- `subject.displayName` が空文字でないこと。
- マークダウン先頭に対象アプリケーション名が含まれること。
