import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadWorkspaceConfig } from '../../src/infrastructure/workspace/loadWorkspaceConfig.js';
import { findWorkspaceRoot } from '../../src/infrastructure/workspace/resolveWorkspaceRoot.js';

/**
 * 【テスト概要】
 * - 対象: findWorkspaceRoot / loadWorkspaceConfig
 * - 条件: 子ディレクトリから親の .traceweave/config.json を探索
 * - 期待結果: ワークスペースルートと集約レポートパスが解決されること
 */
test('workspace config - ネストした cwd からワークスペースルートを解決できること', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-ws-'));
  try {
    fs.mkdirSync(path.join(tempRoot, '.traceweave'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'apps', 'web'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, '.traceweave', 'config.json'),
      JSON.stringify({
        schemaVersion: 1,
        displayName: 'Product',
        testResults: { aggregate: 'reports/test-results.json' },
        suites: [
          {
            id: 'api',
            cwd: 'services/api',
            run: 'npm test',
            capture: 'fragment',
            fragment: 'reports/suites/api.json',
          },
          {
            id: 'web',
            cwd: 'apps/web',
            run: 'npx vitest run',
            capture: 'fragment',
            fragment: 'reports/suites/web.json',
          },
        ],
      }),
      'utf-8'
    );

    const nested = path.join(tempRoot, 'apps', 'web');
    const found = findWorkspaceRoot(nested);
    assert.equal(found, tempRoot);

    const workspace = loadWorkspaceConfig(tempRoot);
    assert.equal(workspace.displayName, 'Product');
    assert.equal(workspace.suites.length, 2);
    assert.ok(workspace.testResultsAggregatePath.endsWith('reports\\test-results.json') ||
      workspace.testResultsAggregatePath.endsWith('reports/test-results.json'));
    assert.equal(workspace.suites[0].capture, 'fragment');
    assert.ok(workspace.suites[1].fragmentPath?.includes('web.json'));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
