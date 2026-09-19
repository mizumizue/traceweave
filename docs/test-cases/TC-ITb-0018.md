---
schema_version: 3
id: TC-ITb-0018
kind: test_case
title: ドキュメントパーサーとSQLiteキャッシュによる仕様セクション抽出および pending 状態永続化の内部結合テスト
status: accepted
created: '2026-09-13'
updated: '2026-09-14'
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
  - sections
  - observation
links: []
---
## Content

### Objective
一時ファイルと SQLite キャッシュを介して、ADR-0006 準拠の Markdown 仕様セクション（4 セクション）および `pending` 既定の実行ステータスを抽出・保存・再取得できることを外部境界テストとして検証する。実行結果の動的注入は `TestReportLoader` または `buildTraceWeaveReport` 経由で行う。

### Preconditions
`DocParser`, `SQLiteCache` モジュールおよびテンポラリディレクトリが利用可能であること。

### Steps
1. ADR-0006 準拠のテストケース（TC）サンプルドキュメントを作成し、`DocParser.parseFile` を実行して抽出されたプロパティを検査する。
2. 抽出結果において `sections` オブジェクトに 4 仕様セクションの見出し名がキーとして含まれ、`execution_status` が `pending` 既定値、`actual_result` が未設定であることを確認する。
3. `SQLiteCache` を有効化した状態で初回パースを行い、キャッシュ DB に保存されたデータを検査する。
4. 同一ドキュメントを再パースし、キャッシュヒットによりディスク読み込みをスキップして同一の構造化データ（sections および `pending` ステータス）が復元されることを確認する。

### Expected Results
- ステップ 1 および 2 で、4 仕様セクションが厳格にパースされ、`execution_status` は `pending`、`actual_result` は未設定であること。
- ステップ 3 および 4 で、SQLite キャッシュを介して sections と `pending` ステータスが欠損なく完全に復元されること。
- （レポート結合検証時）`TestReportLoader.mergeReportIntoNodes()` または `buildTraceWeaveReport` 経由で、テスト実行レポート存在時にのみ `execution_status` および `actual_result` が動的注入されること。
