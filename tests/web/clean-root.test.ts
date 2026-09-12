import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 【テスト概要】
 * - 対象: リポジトリ構成ガバナンス（クリーンルート規約および資産カプセル化）
 * - 条件: ワークスペースルート、src/、src/web/、bin/ ディレクトリのファイル配置を検査
 * - 期待結果: ルート直下に禁止資材（node_modules, dist, HTML/CSS設定）が存在せず、実装資材がsrc/に、Web資材がsrc/web/に完全集約されていること
 * - 関連文書: TC-0014, TC-0016, REQ-0014, REQ-0016, ADR-0004
 */
test('TC-0014 & TC-0016: クリーンルート規約 - ルート直下の禁止資材非存在、src/webへの資材カプセル化、およびbin/ラッパー配置の検証', () => {
  const rootDir = path.resolve('.');

  // 1. Prohibited development assets directly in root (clean root)
  const prohibitedInRoot = [
    'node_modules',
    'dist',
    'dist-web',
    'index.html',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
  ];

  for (const item of prohibitedInRoot) {
    const itemPath = path.join(rootDir, item);
    assert.ok(
      !fs.existsSync(itemPath),
      `Prohibited asset "${item}" must NOT exist in the repository root`
    );
  }

  // 2. Encapsulated assets in src/
  const requiredInSrc = [
    'package.json',
    'tsconfig.json',
    'node_modules',
    'dist',
  ];

  for (const item of requiredInSrc) {
    const itemPath = path.join(rootDir, 'src', item);
    assert.ok(
      fs.existsSync(itemPath),
      `Required asset "${item}" must exist in src/`
    );
  }

  // 3. Encapsulated web assets in src/web/
  const requiredInSrcWeb = [
    'index.html',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'src/main.tsx',
    'src/App.tsx',
    'dist',
  ];

  for (const item of requiredInSrcWeb) {
    const itemPath = path.join(rootDir, 'src/web', item);
    assert.ok(
      fs.existsSync(itemPath),
      `Required web asset "${item}" must exist in src/web/`
    );
  }

  // 4. Built web assets in src/web/dist/
  const webDist = path.join(rootDir, 'src/web/dist');
  assert.ok(fs.existsSync(webDist), 'src/web/dist must exist as built web directory');
  assert.ok(
    fs.existsSync(path.join(webDist, 'index.html')),
    'src/web/dist/index.html must exist'
  );
  assert.ok(
    fs.existsSync(path.join(webDist, 'data.json')),
    'src/web/dist/data.json must exist'
  );

  // 5. Binary wrappers in bin/
  const requiredBin = ['traceweave', 'traceweave.cmd', 'traceweave.ps1'];
  for (const b of requiredBin) {
    assert.ok(
      fs.existsSync(path.join(rootDir, 'bin', b)),
      `Binary wrapper "${b}" must exist in bin/`
    );
  }

  // 6. Governance & architectural documents in root
  const governanceDocs = ['README.md', 'ARCHITECTURE.md', 'DEVELOPER_GUIDE.md'];
  for (const doc of governanceDocs) {
    assert.ok(
      fs.existsSync(path.join(rootDir, doc)),
      `Governance document "${doc}" must exist in repository root`
    );
  }
});
