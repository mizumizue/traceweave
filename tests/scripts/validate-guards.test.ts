import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateNoLocalPaths } from '../../scripts/validate-no-local-paths.js';
import { validateCleanRoot } from '../../scripts/validate-clean-root.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

/**
 * 【テスト概要】
 * - 対象: validateNoLocalPaths (ローカル絶対パス・個人環境情報検知スクリプト)
 * - 条件: 現在のリポジトリ全体を検証対象として実行
 * - 期待結果: ユーザー固有パスやマシン絶対パスが一切検知されず passed: true となること
 * - 関連文書: ADR-0004, ADR-0005, implementation-workflow.mdc
 */
test('[validateNoLocalPaths] 現在のリポジトリ内にローカル絶対パスや個人環境の漏洩が存在しないこと', () => {
  const result = validateNoLocalPaths(ROOT);
  assert.equal(
    result.passed,
    true,
    `ローカル絶対パスの混入が検知されました: ${JSON.stringify(result.findings, null, 2)}`
  );
  assert.equal(result.findings.length, 0);
});

/**
 * 【テスト概要】
 * - 対象: validateNoLocalPaths (ローカル絶対パス・個人環境情報検知スクリプト)
 * - 条件: 意図的にローカル絶対パス（Windows/Unix）を含むファイルを一時ディレクトリ内に配置して検証
 * - 期待結果: 該当ファイルと行番号が正確に検知され passed: false となること
 * - 関連文書: implementation-workflow.mdc
 */
test('[validateNoLocalPaths] Windows形式およびUnix形式のローカル絶対パスが正確に検知・遮断されること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-no-local-paths-test-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });

    // 意図的な違反ファイルの作成（テストスクリプト自体の静的スキャンに誤検知されないよう動的文字列で構築）
    const dummyWinPath = ['C:', 'Users', 'sampleuser', 'Projects', 'app'].join('\\');
    const dummyUnixPath = ['', 'Users', 'anotheruser', 'code'].join('/');
    const leakFile = path.join(docsDir, 'test-leak.md');
    fs.writeFileSync(
      leakFile,
      `# Sample Doc\nLocal path: ${dummyWinPath}\nUnix: ${dummyUnixPath}\n`,
      'utf8'
    );

    const result = validateNoLocalPaths(tempDir);
    assert.equal(result.passed, false);
    assert.ok(result.findings.length >= 2);
    assert.ok(result.findings.some((f) => f.matchedText.includes('sampleuser')));
    assert.ok(result.findings.some((f) => f.matchedText.includes('anotheruser')));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateCleanRoot (クリーンルート整合性検証スクリプト)
 * - 条件: 現在の TraceWeave リポジトリルートを検証対象として実行
 * - 期待結果: 全てのファイルおよびディレクトリが許可リスト（Allowlist）に合致し passed: true となること
 * - 関連文書: ADR-0004, ADR-0005, DEVELOPER_GUIDE.md
 */
test('[validateCleanRoot] リポジトリルートが許可リストのみで構成されクリーンルート規約を満たしていること', () => {
  const result = validateCleanRoot(ROOT);
  assert.equal(
    result.passed,
    true,
    `クリーンルート違反が検知されました: ${JSON.stringify(result.violations, null, 2)}`
  );
  assert.equal(result.violations.length, 0);
});

/**
 * 【テスト概要】
 * - 対象: validateCleanRoot (クリーンルート整合性検証スクリプト)
 * - 条件: 一時ディレクトリにルート直下禁止資材（node_modules, package.json, .cache）を模倣配置して検証
 * - 期待結果: 禁止された各資産が検知され適切な理由とともに passed: false となること
 * - 関連文書: ADR-0004, ADR-0005
 */
test('[validateCleanRoot] ルート直下に配置禁止の開発資材が存在する場合に違反として検知されること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-clean-root-test-'));
  try {
    // 許可されたファイル
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test', 'utf8');
    // 禁止されたディレクトリ・ファイル
    fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.cache'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{}', 'utf8');

    const result = validateCleanRoot(tempDir);
    assert.equal(result.passed, false);
    assert.equal(result.violations.length, 3);
    assert.ok(result.violations.some((v) => v.name === 'node_modules'));
    assert.ok(result.violations.some((v) => v.name === '.cache'));
    assert.ok(result.violations.some((v) => v.name === 'package.json'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
