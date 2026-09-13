import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { repositoryPath } from '../helpers/repo-path.js';
import { validateDocs } from '../../scripts/validate-docs.js';

/**
 * 【テスト概要】
 * - 対象: checkDocs (CLIドキュメント整合性チェッカー)
 * - 条件: 正常な docs/ ディレクトリを対象に通常モードで検証を実行
 * - 期待結果: CLI が正常終了し、検証結果に PASS が含まれること
 * - 関連文書: TC-0005, REQ-0005
 */
test('TC-0005: checkDocs - 正常なドキュメント群に対してPASS判定を返すこと', () => {
  const output = execFileSync(
    process.execPath,
    [
      repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
      repositoryPath('src/cli/index.ts'),
      'check',
      '--docs',
      repositoryPath('docs'),
    ],
    { cwd: repositoryPath(), encoding: 'utf8' }
  );
  assert.match(output, /PASS/);

  const foreignCwdOutput = execFileSync(
    process.execPath,
    [repositoryPath('src/node_modules/tsx/dist/cli.mjs'), repositoryPath('src/cli/index.ts'), 'check'],
    { cwd: repositoryPath('src'), encoding: 'utf8' }
  );
  assert.match(foreignCwdOutput, /PASS/);
});

/**
 * 【テスト概要】
 * - 対象: checkDocs (CLIドキュメント整合性チェッカー)
 * - 条件: strict: true (厳格モード) を指定して欠落リンクを含むフィクスチャを検証
 * - 期待結果: 欠落リンクを検出し、終了コード1で不合格となること
 * - 関連文書: TC-0005, REQ-0005
 */
test('TC-0005: checkDocs - strictモードにおいて欠落リンクを検出し不合格と判定すること', () => {
  const tempDocs = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-check-'));
  try {
    fs.mkdirSync(path.join(tempDocs, 'requirements'));
    fs.writeFileSync(
      path.join(tempDocs, 'requirements', 'REQ-9999.md'),
      `---
id: REQ-9999
kind: requirement
title: Invalid fixture
status: accepted
created: "2026-09-13"
updated: "2026-09-13"
scope: local
depends_on: [NEED-DOES-NOT-EXIST]
tags: []
links: []
---
## Content

### Statement
Fixture

### Acceptance Criteria
- AC-001: Given a fixture When it is checked Then the missing link is reported
`
    );
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [
            repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
            repositoryPath('src/cli/index.ts'),
            'check',
            '--docs',
            tempDocs,
            '--strict',
          ],
          { cwd: repositoryPath(), encoding: 'utf8', stdio: 'pipe' }
        ),
      error => {
        const result = error as { status?: number; stderr?: Buffer; stdout?: Buffer };
        assert.equal(result.status, 1);
        const output = `${result.stdout?.toString() || ''}${result.stderr?.toString() || ''}`;
        assert.match(output, /リンク切れ/);
        return true;
      }
    );

    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [
            repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
            repositoryPath('src/cli/index.ts'),
            'check',
            '--docs',
            path.join(tempDocs, 'missing'),
          ],
          { cwd: repositoryPath(), encoding: 'utf8', stdio: 'pipe' }
        ),
      error => {
        const result = error as { status?: number; stderr?: Buffer; stdout?: Buffer };
        assert.equal(result.status, 1);
        const output = `${result.stdout?.toString() || ''}${result.stderr?.toString() || ''}`;
        assert.match(output, /Docs directory not found/);
        return true;
      }
    );

    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [
            repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
            repositoryPath('src/cli/index.ts'),
            'check',
            '--docs',
            './docs',
          ],
          { cwd: repositoryPath('src'), encoding: 'utf8', stdio: 'pipe' }
        ),
      error => {
        const result = error as { status?: number; stderr?: Buffer; stdout?: Buffer };
        assert.equal(result.status, 1);
        const output = `${result.stdout?.toString() || ''}${result.stderr?.toString() || ''}`;
        assert.match(output, /Docs directory not found/);
        return true;
      }
    );
  } finally {
    fs.rmSync(tempDocs, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (ドキュメントスキーマ・依存関係検証スクリプト)
 * - 条件: 上流要件（REQ）を持たないスタンドアロン仕様（depends_on: []）とそれに対応するDSNを含むフィクスチャを検証
 * - 期待結果: specification must depend on at least one REQ- の制約が緩和され、passed: true となること
 */
test('validateDocs - 上流要件を持たないスタンドアロン仕様（depends_on: []）がスキーマ検証を通過すること', () => {
  const tempDocs = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-standalone-spec-'));
  try {
    fs.mkdirSync(path.join(tempDocs, 'specifications'));
    fs.mkdirSync(path.join(tempDocs, 'design'));

    fs.writeFileSync(
      path.join(tempDocs, 'specifications', 'SPEC-0001.md'),
      `---
schema_version: 3
id: SPEC-0001
kind: specification
title: Standalone Specification
status: accepted
created: "2026-09-13"
updated: "2026-09-13"
scope: local
depends_on: []
tags: [specification]
links: []
---
## Content

### Contract
Standalone API Contract

### Inputs
None

### Outputs
Success code

### Errors
None

### Constraints
None
`
    );

    fs.writeFileSync(
      path.join(tempDocs, 'design', 'DSN-0001.md'),
      `---
schema_version: 3
id: DSN-0001
kind: design
title: Standalone Design
status: accepted
created: "2026-09-13"
updated: "2026-09-13"
scope: local
depends_on: [SPEC-0001]
tags: [design]
links: []
---
## Content

### Decision
Implement directly

### Structure
Simple structure

### Data Flow
Input to output

### Trade-offs
None
`
    );

    const result = validateDocs(tempDocs);
    assert.equal(result.passed, true, `Validation failed with errors: ${result.errors.join(', ')}`);
    assert.equal(result.errors.length, 0);
  } finally {
    fs.rmSync(tempDocs, { recursive: true, force: true });
  }
});

