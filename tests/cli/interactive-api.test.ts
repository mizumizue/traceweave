import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { enrichDocNodes } from '../../src/application/enrich-doc-nodes.js';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { TestRunnerRegistry } from '../../src/core/testing/TestRunnerRegistry.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: DocParser, enrichDocNodes & 対話型テスト実行機構
 * - 条件: parameter_file を持つテストケース (TC-0010) および外部環境依存のテストケース (TC-0004) をパース後 enrichment
 * - 期待結果: TC-0010 は外部JSONパラメータが自動読み込みされ、外部ファイル依存としてUI実行対象外(ui_executable: false)となる一方、TC-0004 も除外判定されること
 * - 関連文書: TC-0011, REQ-0010, SPEC-0010
 */
test('TC-0011: DocParser - parameter_file のパースと外部パラメータデータセットの自動ロードおよびUI実行可否判定ができること', () => {
  const parser = new DocParser();
  const tcPath = repositoryPath('docs/test-cases/TC-0010.md');
  const node = enrichDocNodes([parser.parseFile(tcPath)!])[0];

  assert.ok(node, 'TC-0010 node should parse successfully');
  assert.equal(node.id, 'TC-0010');
  assert.equal(node.parameter_file, 'fixtures/test-cases/TC-0010.json');
  assert.ok(node.parameters, 'node.parameters should be automatically loaded from external json');
  assert.equal(node.parameters.testCaseId, 'TC-0010');
  assert.ok(node.parameters.patterns.length >= 5);
  assert.equal(node.ui_executable, false, 'TC-0010 should be excluded because it loads an external dataset');
  assert.ok(node.inputAnalysis, 'node.inputAnalysis should be populated by script analyzer');
  assert.equal(node.inputAnalysis.isModifiable, false);
  assert.equal(node.inputAnalysis.reasonCode, 'external_environment_dependency');

  const tc4Path = repositoryPath('docs/test-cases/TC-0004.md');
  const node4 = enrichDocNodes([parser.parseFile(tc4Path)!])[0];
  assert.equal(node4?.ui_executable, false, 'TC-0004 should be excluded from UI execution (ui_executable: false)');
  assert.equal(node4?.inputAnalysis?.isModifiable, false);
  assert.equal(node4?.inputAnalysis?.reasonCode, 'external_environment_dependency');
});

/**
 * 【テスト概要】
 * - 対象: TestRunnerRegistry (ピラミッド診断ロジックのデータ駆動テスト実行)
 * - 条件: 正常なピラミッド比率の入力セット、および逆アイスクリームコーン型の入力セットを渡して runTest を実行
 * - 期待結果: 実測結果が期待値と合致し、それぞれの診断ステータス (healthy / inverted_ice_cream) が正しく判定・一致(passed)すること
 * - 関連文書: TC-0011, REQ-0010, SPEC-0010
 */
test('TC-0011: TestRunnerRegistry - テストピラミッド診断のデータ駆動テストにおいて入力に応じた診断ステータスを正しく判定できること', () => {
  // Test healthy pattern
  const healthy = TestRunnerRegistry.runTest({
    testCaseId: 'TC-0011',
    inputs: { unit: 60, integration_internal: 20, integration_external: 10, system: 5, acceptance: 2 },
    expected: { status: 'healthy', hasWarnings: false },
  });
  assert.equal(healthy.status, 'passed');
  assert.equal(healthy.isMatch, true);
  assert.equal(healthy.actual.status, 'healthy');

  // Test trophy pattern
  const trophy = TestRunnerRegistry.runTest({
    testCaseId: 'TC-0011',
    inputs: { unit: 20, integration_internal: 35, integration_external: 35, system: 10, acceptance: 5 },
    expected: { status: 'healthy_trophy', hasWarnings: false },
  });
  assert.equal(trophy.status, 'passed');
  assert.equal(trophy.isMatch, true);
  assert.equal(trophy.actual.status, 'healthy_trophy');

  // Test unbalanced pattern
  const unbalanced = TestRunnerRegistry.runTest({
    testCaseId: 'TC-0011',
    inputs: { unit: 7, integration_internal: 2, integration_external: 40, system: 0, acceptance: 5 },
    expected: { status: 'unbalanced', hasWarnings: true },
  });
  assert.equal(unbalanced.status, 'passed');
  assert.equal(unbalanced.isMatch, true);
  assert.equal(unbalanced.actual.status, 'unbalanced');

  // Test inverted pattern
  const inverted = TestRunnerRegistry.runTest({
    testCaseId: 'TC-0011',
    inputs: { unit: 2, integration_internal: 1, integration_external: 0, system: 15, acceptance: 30 },
    expected: { status: 'inverted_ice_cream', hasWarnings: true },
  });
  assert.equal(inverted.status, 'passed');
  assert.equal(inverted.isMatch, true);
  assert.equal(inverted.actual.status, 'inverted_ice_cream');
});

test('TC-0011: CLI serve - 外部HTTP APIが対話型テスト実行結果を返すこと', async () => {
  const port = 32000 + Math.floor(Math.random() * 1000);
  const child = spawn(
    process.execPath,
    [
      repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
      repositoryPath('src/cli/index.ts'),
      'serve',
      '--port',
      String(port),
      '--docs',
      repositoryPath('docs'),
    ],
    { cwd: repositoryPath(), stdio: ['ignore', 'pipe', 'pipe'] }
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('serve did not start')), 10_000);
      child.stdout.on('data', chunk => {
        if (String(chunk).includes('is running at')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.once('error', error => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', code => {
        if (code !== null && code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`serve exited with code ${code}`));
        }
      });
    });

    const response = await fetch(`http://127.0.0.1:${port}/api/test/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        testCaseId: 'TC-0011',
        inputs: { unit: 60, integration_internal: 20, integration_external: 10, system: 5, acceptance: 2 },
        expected: { status: 'healthy', hasWarnings: false },
      }),
    });
    assert.equal(response.status, 200);
    const result = await response.json() as { status: string; isMatch: boolean; actual: { status: string } };
    assert.equal(result.status, 'passed');
    assert.equal(result.isMatch, true);
    assert.equal(result.actual.status, 'healthy');
  } finally {
    child.kill();
  }
});

/**
 * 【テスト概要】
 * - 対象: POST /api/test/run のエラー契約
 * - 条件: 未登録 TC-ID と UI 実行除外 TC-ID を順に呼び出す
 * - 期待結果: 未登録は 404、除外対象は 400 が返ること
 * - 関連文書: TC-0040, SPEC-0008, REQ-0009
 */
test('TC-0040: CLI serve - /api/test/run が未知TCで404・UI除外TCで400を返すこと', async () => {
  const port = 33000 + Math.floor(Math.random() * 1000);
  const child = spawn(
    process.execPath,
    [
      repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
      repositoryPath('src/cli/index.ts'),
      'serve',
      '--port',
      String(port),
      '--docs',
      repositoryPath('docs'),
    ],
    { cwd: repositoryPath(), stdio: ['ignore', 'pipe', 'pipe'] }
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('serve did not start')), 10_000);
      child.stdout.on('data', chunk => {
        if (String(chunk).includes('is running at')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.once('error', error => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    const unknown = await fetch(`http://127.0.0.1:${port}/api/test/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ testCaseId: 'TC-9999', inputs: {} }),
    });
    assert.equal(unknown.status, 404);
    const unknownBody = await unknown.json() as { error: string };
    assert.equal(unknownBody.error, 'ERR_UNKNOWN_TEST_CASE');

    const excluded = await fetch(`http://127.0.0.1:${port}/api/test/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ testCaseId: 'TC-0010', inputs: {} }),
    });
    assert.equal(excluded.status, 400);
    const excludedBody = await excluded.json() as { error: string };
    assert.equal(excludedBody.error, 'ERR_NOT_UI_EXECUTABLE');
  } finally {
    child.kill();
  }
});

/**
 * 【テスト概要】
 * - 対象: CLI serve の静的ファイル配信
 * - 条件: distWeb 外を指すパストラバーサル URL を GET する
 * - 期待結果: 403 Forbidden が返り、リポジトリ外のファイルが読み取られないこと
 */
test('CLI serve - パストラバーサル要求を 403 で拒否すること', async () => {
  const port = 34000 + Math.floor(Math.random() * 1000);
  const child = spawn(
    process.execPath,
    [
      repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
      repositoryPath('src/cli/index.ts'),
      'serve',
      '--port',
      String(port),
      '--docs',
      repositoryPath('docs'),
    ],
    { cwd: repositoryPath(), stdio: ['ignore', 'pipe', 'pipe'] }
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('serve did not start')), 10_000);
      child.stdout.on('data', chunk => {
        if (String(chunk).includes('is running at')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.once('error', error => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    const { statusCode, body } = await requestRawPath(port, '/../package.json');
    assert.equal(statusCode, 403);
    assert.equal(body, 'Forbidden');
  } finally {
    child.kill();
  }
});

function requestRawPath(port: number, requestPath: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: requestPath,
        method: 'GET',
      },
      res => {
        let body = '';
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}
