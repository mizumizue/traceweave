---
schema_version: 3
id: TC-ITb-0025
kind: test_case
title: Webダッシュボード トースト通知基盤のマウント契約およびトレーサビリティ連鎖の検証
status: accepted
created: '2026-09-13'
updated: '2026-09-19'
scope: local
test_level: integration_external
test_method: unit_contract
verifies:
  - REQ-0012
  - SPEC-0012
depends_on: []
tags:
  - web
  - toast
  - sonner
  - feedback
  - notification
links: []
---
## Content

### Objective
Web ダッシュボードのルートコンポーネントがトースト通知基盤（Toaster）を常駐マウントする公開契約を満たし、REQ-0012 から SPEC-0012 へのトレーサビリティ連鎖が成立していることを検証する。実 DOM への通知描画・自動消去・z-index はブラウザ E2E の対象外とする。

### Preconditions
- ルートコンポーネントの公開ソースが読み取り可能であること。
- `docs/` 配下のトレーサビリティグラフが構築可能であること。

### Steps
1. ルートコンポーネントソースから Toaster のマウント宣言（position, theme, closeButton 等）を検査する。
2. 文書グラフ上で REQ-0012、SPEC-0012、本テストケース ID の存在と depends_on / verifies 連鎖を検査する。

### Expected Results
- ルートコンポーネントに `<Toaster` が宣言され、画面右下・ダークテーマ・クローズボタン付きの設定が含まれること。
- REQ-0012 → SPEC-0012 の `depends_on` 連鎖がグラフ上で成立していること。
- TC-ITb-0025 が REQ-0012 および SPEC-0012 を `verifies` に含むこと。
