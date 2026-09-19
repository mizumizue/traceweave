---
schema_version: 3
id: TC-ITb-0018
kind: test_case
title: 文書パースとキャッシュ経由の仕様セクション抽出の外部結合検証
status: accepted
created: '2026-09-13'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: scenario
verifies:
  - REQ-0006
  - REQ-0007
  - SPEC-0006
  - SPEC-0007
depends_on: []
tags:
  - test
  - integration
  - parser
  - cache
links: []
---
## Content

### Objective
文書整合性検証およびレポート生成の結果として、テストケース文書の仕様セクションが抽出され、実行ステータスは未実行（pending）が既定となることを検証する。実行合格は別途証跡レポートで上書きされる。

### Preconditions
リポジトリに標準形式のテストケース文書が存在すること。

### Steps
1. 文書整合性検証コマンドを実行し、テストケース文書がエラーなくパースされることを確認する。
2. ダッシュボード用データビルドを実行し、代表テストケースの Objective / Steps / Expected Results がノード詳細に含まれることを確認する。
3. 証跡レポート未結合時、当該ノードの実行ステータスが未実行であることを確認する。
4. 同一文書を再ビルドし、キャッシュ有効時も同一の仕様セクションが得られることを確認する。

### Expected Results
- 四つの仕様見出しが欠落なく抽出されること。
- 静的文書のみでは実行結果フィールドが本文に書かれていないこと。
- 再ビルドで仕様内容が決定論的に一致すること。
