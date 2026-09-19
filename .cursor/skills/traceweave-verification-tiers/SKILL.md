---
name: traceweave-verification-tiers
description: TraceWeave の形式証跡（formal）と補助ハーネス（supplementary）の配置、TC タイトル宣言行、E2E スイートを決める。テスト配置・証跡マージ・Playwright E2E・tests/support を触るとき、または ADR-0011 / REQ-0035 に言及したときに使う。
---

# TraceWeave verification tiers

先導語: **_formal_** — ダッシュボードが読む証跡。 **_supplementary_** — 走らせるがマージしないハーネス。

## Steps

1. **オラクルを分類する** — 合否が「公開契約の純粋関数」か「実ブラウザ DOM」か「手動受入」かを TC 文書の Steps から判定する。詳細な配置表は [`references/TIER-MATRIX.md`](references/TIER-MATRIX.md)。
2. **形式宣言行を置く** — formal 自動化は `test('TC-xxxx: …')` をタイトル**行頭**に置く。補助のみなら `support:` で始め、TC を本文に埋め込まない。
3. **スイートを選ぶ** — `.traceweave/config.json` の `evidenceTier` と `testsDir` を確認。Node formal は `tests/support`・`tests/e2e` を除外。E2E は `tests/e2e/*.spec.ts` + Playwright。
4. **完了基準** — `npm --prefix src run lint` が成功し、対象 TC を `--tc` で実行したとき formal キーだけ `reports/test-results.json` に出る。supplementary 実行後も aggregate に `support:` 由来の TC キーが増えていない。

## Reference

- 決定: `docs/decisions/ADR-0011.md`
- 契約: `docs/specifications/SPEC-0030.md`
- 実装: `docs/design/DSN-0025.md`
- タイトル規則: `.cursor/rules/test-writing-guidelines.mdc`（形式宣言行セクション）
