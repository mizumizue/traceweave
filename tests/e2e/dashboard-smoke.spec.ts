import { test, expect } from '@playwright/test';

/**
 * 【テスト概要】
 * - 対象: Web ダッシュボード（ビルド済み静的配布物 + プレビューサーバ）
 * - 条件: Playwright Chromium でルート URL を開く
 * - 期待結果: タイトル・トレーサビリティ UI・マトリクス要件行がブラウザ上で観測できること
 * - 関連文書: TC-ST-0003, REQ-0006, REQ-0007
 */
test('TC-ST-0003: 静的ダッシュボードがブラウザで読み込みマトリクス要件行を表示すること', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/TraceWeave/i);
  await expect(page.getByText('トレーサビリティ', { exact: false }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('REQ-0001', { exact: false }).first()).toBeVisible({
    timeout: 30_000,
  });
});
