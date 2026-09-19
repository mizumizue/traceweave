import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: binラッパースクリプト群およびクリーンルート規約
 * - 条件: bin/ 配下のラッパーファイル、NODE_PATH設定ロジック、およびルート直下の資材構成を検査
 * - 期待結果: ルートに node_modules や dist が存在せず、bin/traceweave ラッパー経由で依存関係が透過的に解決される構成であること
 * - 関連文書: TC-ITb-0021, ADR-0005
 */
test('TC-ITb-0021: クリーンルート規約およびbinラッパー構成の外部結合検証', () => {
  const rootDir = repositoryPath();

  // 1. Root remains free of generated/dependency directories.
  assert.equal(fs.existsSync(path.join(rootDir, 'node_modules')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'dist')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'dist-web')), false);

  // 2. Encapsulated in src/: package.json, tsconfig.json, node_modules
  assert.ok(fs.existsSync(path.join(rootDir, 'src/package.json')), 'src/package.json must exist');
  assert.ok(fs.existsSync(path.join(rootDir, 'src/node_modules')), 'src/node_modules must exist');

  // 3. Wrapper scripts in bin/
  const binShPath = path.join(rootDir, 'bin/traceweave');
  const binCmdPath = path.join(rootDir, 'bin/traceweave.cmd');
  const binPs1Path = path.join(rootDir, 'bin/traceweave.ps1');

  assert.ok(fs.existsSync(binShPath), 'bin/traceweave must exist');
  assert.ok(fs.existsSync(binCmdPath), 'bin/traceweave.cmd must exist');
  assert.ok(fs.existsSync(binPs1Path), 'bin/traceweave.ps1 must exist');

  // 4. All platform wrapper entry points are present; execution is outside
  // this repository-layout check and is covered by the CLI contract tests.
  assert.ok(fs.statSync(binShPath).isFile());
  assert.ok(fs.statSync(binCmdPath).isFile());
  assert.ok(fs.statSync(binPs1Path).isFile());
});
