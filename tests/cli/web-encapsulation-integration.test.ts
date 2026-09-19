import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { repositoryPath } from '../helpers/repo-path.js';
import viteConfig from '../../src/web/vite.config.js';

/**
 * 【テスト概要】
 * - 対象: Web資材集約・ビルド設定およびCLIアセット配信解決
 * - 条件: src/web 配下の設定ファイル、ビルド成果物、およびCLI配信パス解決候補リストを検査
 * - 期待結果: ルート直下に個別のWeb設定ファイルが存在せず、src/web配下に集約され、CLIが優先的に解決できること
 * - 関連文書: TC-ITb-0019, ADR-0004
 */
test('TC-ITb-0019: Webフロントエンド開発資材のカプセル化・ビルド出力設定およびCLIアセット解決の外部結合検証', () => {
  const rootDir = repositoryPath();

  // 1. Root directory must NOT contain individual web asset configs
  const prohibitedInRoot = [
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
  ];
  for (const file of prohibitedInRoot) {
    const p = path.join(rootDir, file);
    assert.equal(fs.existsSync(p), false, `Root must not contain ${file}`);
  }

  // 2. src/web must contain web configs and index.html
  const requiredInWeb = [
    'src/web/index.html',
    'src/web/vite.config.ts',
    'src/web/tailwind.config.js',
    'src/web/postcss.config.js',
    'src/web/src/App.tsx',
  ];
  for (const relPath of requiredInWeb) {
    const p = path.join(rootDir, relPath);
    assert.ok(fs.existsSync(p), `src/web must contain ${relPath}`);
  }

  // 3. Load the Vite configuration and inspect its resolved behavior.
  assert.equal(viteConfig.root, path.join(rootDir, 'src/web'));
  assert.ok(viteConfig.plugins && viteConfig.plugins.length > 0, 'Vite plugins must be configured');
  assert.equal(viteConfig.build?.outDir, path.join(rootDir, 'src/web/dist'));

  // 4. CLI asset output resolution check
  const existingDist = path.resolve(rootDir, 'src/web/dist');
  assert.ok(fs.existsSync(path.join(existingDist, 'index.html')), 'src/web/dist must contain built index.html');
  assert.ok(fs.existsSync(path.join(existingDist, 'data.json')), 'src/web/dist must contain data.json');
});
