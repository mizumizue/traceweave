import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const require = createRequire(path.join(repoRoot, 'src', 'package.json'));
const { defineConfig } = require('@playwright/test');

export default defineConfig({
  testDir: __dirname,
  testMatch: '**/*.spec.ts',
  outputDir: path.join(repoRoot, 'reports', 'playwright-test-results'),
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx --prefix "${path.join(repoRoot, 'src')}" vite preview --host 127.0.0.1 --port 4173 --strictPort`,
    cwd: repoRoot,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  reporter: [
    ['list'],
    [
      'json',
      { outputFile: path.join(repoRoot, 'reports', 'suites', 'e2e-playwright-raw.json') },
    ],
  ],
});
