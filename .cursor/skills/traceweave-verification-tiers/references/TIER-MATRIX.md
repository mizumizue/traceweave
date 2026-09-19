# Verification tier matrix

| 目的 | 配置 | スイート | タイトル |
|---|---|---|---|
| UT / ITa / ITb / ST の公開 API・契約 | `tests/core/`, `tests/application/`, `tests/cli/` 等 | `node` (formal) | `TC-xxxx:` 行頭 |
| UI ソース読取・ビルド成果物・静的解析 | `tests/support/**` | `support` (supplementary) | `support:` 行頭（TC 行頭禁止） |
| ブラウザ DOM・ナビゲーション | `tests/e2e/*.spec.ts` | `e2e` (formal) | `TC-xxxx:` 行頭 |
| HTTP 公開 API | Newman + Postman fixtures | `newman-api` (formal) | コレクション項目名に `TC-` |

## Anti-patterns

- `support:` テストのタイトルに `TC-ITb-0020:` を付けて formal 証跡を取る（禁止）。
- `tests/web/` という疑似レイヤを UT/UAT の代替とみなす（廃止。`tests/support/web-contract` は supplementary）。
- Playwright なしで ST/UAT のブラウザ Steps を Node ソース検査だけで passed にする。

## Environment

- E2E 初回: `npm install` in `src/`, then `npx --prefix src playwright install chromium`
- ブラウザなしローカル: `TW_SKIP_E2E=1 npm --prefix src test`（E2E 証跡は更新されない）
