import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { adoptProject } from '../../src/application/adopt-project/index.js';
import { checkAdoptQuality } from '../../src/application/adopt-project/quality-check.js';
import { repositoryPath } from '../helpers/repo-path.js';

test('checkAdoptQuality - adopt 直後の品質キットが必須ファイルと AC 参照を満たすこと', () => {
  const tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-adopt-quality-'));
  try {
    fs.cpSync(repositoryPath('tests/fixtures/adopt/existing-project'), tempBaseDir, { recursive: true });
    adoptProject({ targetDir: tempBaseDir, mode: 'overlay', silent: true });

    const result = checkAdoptQuality(tempBaseDir);
    assert.equal(result.passed, true, result.errors.join('; '));
    assert.ok(
      result.warnings.some((w) => w.includes('TC-0001') || w.includes('test files')),
      `expected customization warnings, got: ${result.warnings.join('; ')}`
    );
  } finally {
    fs.rmSync(tempBaseDir, { recursive: true, force: true });
  }
});

test('checkAdoptQuality - 品質キット未配備のディレクトリは不合格となること', () => {
  const tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-adopt-quality-empty-'));
  try {
    const result = checkAdoptQuality(tempBaseDir);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some((e) => e.includes('TC-0002.md')));
  } finally {
    fs.rmSync(tempBaseDir, { recursive: true, force: true });
  }
});
