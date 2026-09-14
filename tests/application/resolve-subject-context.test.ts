import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveSubjectContext } from '../../src/application/resolve-subject-context.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: resolveSubjectContext（対象アプリ表示名解決）
 * - 条件: CLI・設定・パッケージマニフェスト・ディレクトリ名の各入力
 * - 期待結果: SPEC-0025 の優先順で displayName と source が決定されること
 * - 関連文書: TC-0057, REQ-0030, SPEC-0025
 */
test('TC-0057: resolveSubjectContext - CLI 指定が最優先で解決されること', () => {
  const result = resolveSubjectContext({
    repoRoot: repositoryPath(),
    cliSubject: 'override-app',
  });
  assert.equal(result.displayName, 'override-app');
  assert.equal(result.source, 'cli');
});

/**
 * 【テスト概要】
 * - 対象: resolveSubjectContext（設定ファイル解決）
 * - 条件: .traceweave/config.json に displayName を設定
 * - 期待結果: config ソースが package 名より優先されること
 * - 関連文書: TC-0057, REQ-0030, SPEC-0025
 */
test('TC-0057: resolveSubjectContext - 設定ファイルがパッケージ名より優先されること', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-subject-config-'));
  try {
    fs.mkdirSync(path.join(tempRoot, '.traceweave'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, '.traceweave', 'config.json'),
      JSON.stringify({ displayName: 'Configured App' }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: 'package-name' }),
      'utf-8'
    );

    const result = resolveSubjectContext({ repoRoot: tempRoot });
    assert.equal(result.displayName, 'Configured App');
    assert.equal(result.source, 'config');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: resolveSubjectContext（フォールバック）
 * - 条件: マニフェストも設定もない空ディレクトリ
 * - 期待結果: ディレクトリ名または unknown-project が返ること
 * - 関連文書: TC-0057, REQ-0030, SPEC-0025
 */
test('TC-0057: resolveSubjectContext - 入力不足時にフォールバック名が返ること', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-subject-fallback-'));
  try {
    const result = resolveSubjectContext({ repoRoot: tempRoot });
    assert.ok(result.displayName.length > 0);
    assert.equal(result.source, 'directory');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
