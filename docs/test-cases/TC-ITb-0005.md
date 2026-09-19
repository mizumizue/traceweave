---
schema_version: 3
id: TC-ITb-0005
kind: test_case
title: テストケース詳細の静的パースが実行合否を文書から採用しないことの検証
status: accepted
created: '2026-09-12'
updated: '2026-09-14'
scope: local
verifies:
  - REQ-0006
  - REQ-0007
  - SPEC-0006
depends_on: []
tags:
  - integration
  - parser
  - actual-result
links: []
test_level: integration_external
test_method: scenario
criticality: high
---
## Content

### Objective
テストケース文書を静的パースしたとき、フロントマターや本文に実行合否や実測が書いてあっても、ノードの実行ステータスは未実行となり実測値は未設定であることを検証する。仕様セクション（目的・手順・期待値）は保持される。

### Preconditions
フロントマターに実行ステータスと実測値、本文に実測・証跡セクションを含むテストケース Markdown が存在すること。

### Steps
1. パーサに当該テストケース Markdown ファイルを渡す。
2. 返却ノードの実行ステータス、実測値、仕様セクションをアサートする。

### Expected Results
- 実行ステータスが `pending` であること。
- 実測値が未設定であること。
- 目的・手順・期待値セクションが取得できること。
- 本文に実測見出しがあっても、それが実行合否としては採用されないこと。
