import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { installCursorSkills } from '../../scripts/install-cursor-skills.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

/**
 * 【テスト概要】
 * - 対象: installCursorSkills (Cursor スキル配備)
 * - 条件: 一時プロジェクトディレクトリへ project ターゲットで dry-run なしインストール
 * - 期待結果: traceweave-docs-audit および traceweave-install-skills が SKILL.md 付きで配置されること
 */
test('installCursorSkills - project ターゲットへ bundled スキルが配備されること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-install-skills-'));
  try {
    const result = installCursorSkills({
      repoRoot: ROOT,
      target: 'project',
      projectDir: tempDir,
      withRules: true,
    });

    assert.ok(result.skillsInstalled.length >= 2);
    assert.ok(result.skillsInstalled.includes('traceweave-docs-audit'));
    assert.ok(result.skillsInstalled.includes('traceweave-install-skills'));

    const auditSkill = path.join(tempDir, '.cursor', 'skills', 'traceweave-docs-audit', 'SKILL.md');
    const fenceChecks = path.join(tempDir, '.cursor', 'skills', 'traceweave-docs-audit', 'FENCE-CHECKS.md');
    assert.ok(fs.existsSync(auditSkill));
    assert.ok(fs.existsSync(fenceChecks));

    const schemaRule = path.join(tempDir, '.cursor', 'rules', 'docs-document-schema.mdc');
    assert.ok(fs.existsSync(schemaRule));
    assert.ok(result.rulesInstalled.includes('docs-document-schema.mdc'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: installCursorSkills (dry-run)
 * - 条件: 書き込みなしで project ターゲットを指定
 * - 期待結果: スキル名が列挙され、ディスク上にファイルが作成されないこと
 */
test('installCursorSkills - dry-run ではファイルを書き込まないこと', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-install-skills-dry-'));
  try {
    const result = installCursorSkills({
      repoRoot: ROOT,
      target: 'project',
      projectDir: tempDir,
      dryRun: true,
    });

    assert.ok(result.skillsInstalled.length > 0);
    assert.equal(fs.existsSync(path.join(tempDir, '.cursor')), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
