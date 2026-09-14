import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateDocs } from '../../scripts/validate-docs.js';

function writeMinimalRequirement(docsDir: string): void {
  const reqDir = path.join(docsDir, 'requirements');
  fs.mkdirSync(reqDir, { recursive: true });
  fs.writeFileSync(
    path.join(reqDir, 'REQ-0001.md'),
    `---
schema_version: 3
id: REQ-0001
kind: requirement
title: Sample requirement
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
depends_on: []
tags: [test]
links: []
requirement_class: functional
---
## Content

### Statement
Sample statement.

### Acceptance Criteria
- AC-001: Given sample When action Then result.
`,
    'utf8'
  );
}

function writeTestCaseWithForbiddenSection(
  docsDir: string,
  forbiddenHeading: string,
  sectionBody: string
): void {
  const tcDir = path.join(docsDir, 'test-cases');
  fs.mkdirSync(tcDir, { recursive: true });
  fs.writeFileSync(
    path.join(tcDir, 'TC-0001.md'),
    `---
schema_version: 3
id: TC-0001
kind: test_case
title: Sample TC
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
test_level: unit
test_method: unit_mock
verifies: [REQ-0001]
depends_on: []
tags: [unit]
links: []
---
## Content

### Objective
Verify something.

### Preconditions
Ready.

### Steps
1. Run.

### Expected Results
Pass.

${forbiddenHeading}
${sectionBody}
`,
    'utf8'
  );
}

/**
 * 【テスト概要】
 * - 対象: validateDocs (test_case 本文の禁止セクション検査)
 * - 条件: ## Content 以下に ADR-0006 で廃止された ### Actual Results を含む TC フィクスチャを検証
 * - 期待結果: passed: false となり、ADR-0006 を参照する禁止セクションエラーが返ること
 * - 関連文書: ADR-0006, REQ-0007
 */
test('validateDocs - test_case 本文の ### Actual Results セクションが ADR-0006 違反として拒否されること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-tc-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalRequirement(docsDir);
    writeTestCaseWithForbiddenSection(docsDir, '### Actual Results', 'Return value was true.');

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some(
        (err) => err.includes('Actual Results') && err.includes('ADR-0006')
      ),
      `Expected ADR-0006 Actual Results error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (test_case 本文の禁止セクション検査)
 * - 条件: ## Content 以下に ADR-0006 で廃止された ### Evidence を含む TC フィクスチャを検証
 * - 期待結果: passed: false となり、ADR-0006 を参照する禁止セクションエラーが返ること
 * - 関連文書: ADR-0006, REQ-0007
 */
test('validateDocs - test_case 本文の ### Evidence セクションが ADR-0006 違反として拒否されること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-tc-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalRequirement(docsDir);
    writeTestCaseWithForbiddenSection(docsDir, '### Evidence', 'Log outputs confirmed.');

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some(
        (err) => err.includes('Evidence') && err.includes('ADR-0006')
      ),
      `Expected ADR-0006 Evidence error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
