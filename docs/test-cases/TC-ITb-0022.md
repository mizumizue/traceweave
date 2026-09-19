---
schema_version: 3
id: TC-ITb-0022
kind: test_case
title: 決め事カタログ CLI の集約・相互参照・フィルタ契約
status: accepted
created: '2026-09-13'
updated: '2026-09-19'
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
  - integration
  - catalog
  - cli
links: []
---
## Content

### Objective
決め事カタログ CLI が種別集計、相互参照、フィルタ・検索を JSON で返す契約を満たすことを検証する。

### Preconditions
リポジトリに TraceWeave 文書が配置されていること。

### Steps
1. リポジトリルートでカタログを JSON 形式で取得する。
2. 種別別件数と総件数が文書件数と整合することを確認する。
3. アクター・ユースケース、設計・ADR の相互参照が JSON 内で解決されていることを確認する。
4. 種別フィルタおよびキーワード検索を指定し、返却件数と項目が期待と一致することを確認する。

### Expected Results
- 主要種別が集約され、相互参照が正確であること。
- フィルタおよび検索が決定論的に動作すること。
- CLI 終了コードが 0 で JSON がパース可能であること。
