---
schema_version: 3
id: TC-ITb-0022
kind: test_case
title: 全決め事カタログ集約・相互参照（ACT-UC/DSN-ADR/REQ-SPEC）解決およびCLI探索コマンドの内部結合テスト
status: accepted
created: '2026-09-13'
updated: '2026-09-13'
scope: local
test_level: integration_external
test_method: api_contract
verifies:
  - REQ-0017
  - REQ-0018
  - REQ-0019
  - SPEC-0017
depends_on: []
tags:
  - test
  - integration
  - catalog
  - decisions
  - relationships
  - cli
links: []
---
## Content

### Objective
実ドキュメント群からカタログを構築し、主要種別の集約、相互参照、フィルタリング、および CLI `catalog --format json` の外部契約を検証する。ブラウザ表示は対象外とする。

### Preconditions
`DocParser`, `DecisionsCatalogBuilder`, および `docs/` 配下の実ドキュメント群が利用可能であること。

### Steps
1. `DocParser.parseDirectory` により `docs/` 配下の全ドキュメントノードをパースする。
2. `DecisionsCatalogBuilder.build(nodes)` を実行し、主要種別の文書件数カウント（`kindCounts`）と総件数（`totalCount`）が集約されていることを検査する。
3. カタログ内のアクターノードおよびユースケースノードを検査し、`relatedUseCases` および `relatedActors` が双方向に解決されていることを確認する。
4. 設計（DSN）および意思決定（ADR）ノードを検査し、相互のリンク関係が関連付けられていることを確認する。
5. 種別フィルター（`kind: 'decision'`）およびキーワード検索（`query: 'matrix'`）を適用し、意図したドキュメントのみが厳格にフィルタリングされることを確認する。
6. CLI の `catalog --format json --kind decision` を実行し、JSON の `filteredCount` と項目種別を検証する。

### Expected Results
- 主要種別の決め事ドキュメントが集約され、逆引き参照関係が正確に構築されること。
- フィルタリングおよび検索結果が期待通りのドキュメント集合を返すこと。
- CLI の JSON 出力が意思決定種別だけを含み、カタログ件数と一致すること。
