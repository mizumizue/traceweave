import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  probeProject,
  createBackup,
  adoptProject,
  rollbackAdoption,
} from '../../src/application/adopt-project/index.js';
import { validateDocs } from '../../scripts/validate-docs.js';
import { repositoryPath } from '../helpers/repo-path.js';

test.describe('TraceWeave Adoption Engine (adopt-project)', () => {
  let tempBaseDir: string;

  test.beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-adopt-test-'));
  });

  test.afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  /**
   * 【テスト概要】
   * - 対象: probeProject
   * - 条件: package.json (Jest依存あり) と README.md を含むダミープロジェクトフィクスチャを解析
   * - 期待結果: プロジェクト名、言語 (TypeScript / JavaScript)、テストランナー (jest) が正確に検出されること
   * - 関連文書: ADR-0007
   */
  test('probeProject - 既存プロジェクトの言語・フレームワーク・テストランナーが正確に検出されること', () => {
    fs.cpSync(repositoryPath('tests/fixtures/adopt/sample-backend'), tempBaseDir, { recursive: true });

    const probe = probeProject(tempBaseDir);

    assert.equal(probe.projectName, 'sample-backend-service');
    assert.ok(probe.languages.includes('TypeScript'));
    assert.equal(probe.testFramework, 'jest');
    assert.equal(probe.hasPackageJson, true);
    assert.equal(probe.existingDocsDir, false);
  });

  /**
   * 【テスト概要】
   * - 対象: adoptProject (overlay モード)
   * - 条件: 既存のコードと設定が存在するプロジェクトフィクスチャに対して overlay モードで適用
   * - 期待結果:
   *   1. 既存のファイル (index.js, README.md) が破壊・変更されず維持されること
   *   2. docs/ 配下に V字モデルの全種別ドキュメントが配備されること
   *   3. bin/ 配下に実行ラッパーが配備されること
   *   4. 生成された docs/ が validateDocs の厳格スキーマ検査をエラー0件でパスすること
   *   5. .traceweave-backup 配下にバックアップとマニフェストが保存されること
   * - 関連文書: ADR-0007
   */
  test('adoptProject - overlayモードにおいて既存資材を温存し、スキーマ準拠のV字ドキュメント群およびラッパーが安全に配備されること', () => {
    fs.cpSync(repositoryPath('tests/fixtures/adopt/existing-project'), tempBaseDir, { recursive: true });
    const originalCode = fs.readFileSync(path.join(tempBaseDir, 'index.js'), 'utf-8');

    const result = adoptProject({
      targetDir: tempBaseDir,
      mode: 'overlay',
      projectName: 'test-adopted-app',
      silent: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'overlay');

    // 1. 既存ファイルが温存されていること
    assert.equal(fs.readFileSync(path.join(tempBaseDir, 'index.js'), 'utf-8'), originalCode);

    // 2. docs/ が生成されていること
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'needs', 'NEED-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'requirements', 'REQ-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'specifications', 'SPEC-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'design', 'DSN-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'decisions', 'ADR-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'test-cases', 'TC-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'test-cases', 'TC-0002.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'actors', 'ACT-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'usecases', 'UC-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'quality', 'QA-0001.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'SYSTEM_OVERVIEW.md')));

    const glossaryFiles = fs
      .readdirSync(path.join(tempBaseDir, 'docs', 'glossary'))
      .filter(f => f.startsWith('GLO-') && f.endsWith('.md'));
    assert.equal(glossaryFiles.length, 14, 'adopt should ship all TraceWeave platform glossary terms');
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'glossary', 'GLO-0001.md')));
    const glo1 = fs.readFileSync(path.join(tempBaseDir, 'docs', 'glossary', 'GLO-0001.md'), 'utf-8');
    assert.ok(glo1.includes('title: トレーサビリティ'), 'GLO-0001 should be the platform term, not project name');

    // 3. bin/ ラッパーが生成されていること
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'bin', 'traceweave')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'bin', 'traceweave.cmd')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'bin', 'traceweave.ps1')));

    // 3b. Cursor MCP 設定が生成されていること
    assert.ok(fs.existsSync(path.join(tempBaseDir, '.cursor', 'mcp.json')));
    const mcpConfig = JSON.parse(fs.readFileSync(path.join(tempBaseDir, '.cursor', 'mcp.json'), 'utf-8'));
    assert.ok(mcpConfig.mcpServers?.traceweave);

    // 3c. 品質キットが生成されていること
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs', 'ADOPT_QUALITY_SETUP.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'scripts', 'traceweave-capture-test-report.mjs')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, '.github', 'workflows', 'traceweave-governance.yml')));
    assert.ok(
      fs.existsSync(path.join(tempBaseDir, '.cursor', 'skills', 'traceweave-test-case-review', 'SKILL.md'))
    );
    const tc1 = fs.readFileSync(path.join(tempBaseDir, 'docs', 'test-cases', 'TC-0001.md'), 'utf-8');
    assert.ok(tc1.includes('AC-001'));
    const tc2 = fs.readFileSync(path.join(tempBaseDir, 'docs', 'test-cases', 'TC-0002.md'), 'utf-8');
    assert.ok(tc2.includes('AC-002'));

    // 4. validateDocs でスキーマ検査をパスすること
    const validation = validateDocs(path.join(tempBaseDir, 'docs'));
    assert.equal(validation.errors.length, 0, `Validation errors: ${validation.errors.join(', ')}`);
    assert.equal(validation.passed, true);

    // 5. バックアップが生成されていること
    assert.ok(result.backupDir);
    assert.ok(fs.existsSync(result.backupDir!));
    assert.ok(fs.existsSync(path.join(result.backupDir!, 'backup-manifest.json')));
  });

  /**
   * 【テスト概要】
   * - 対象: adoptProject (restructure モード)
   * - 条件: ルート直下に package.json, tsconfig.json が存在するプロジェクトフィクスチャを restructure モードで再構成
   * - 期待結果:
   *   1. package.json, tsconfig.json が src/ 配下にカプセル化（移動）されること
   *   2. ルートに DEVELOPER_GUIDE.md および bin/ ラッパーが配備されること
   *   3. .gitignore にクリーンルート用の除外設定が追記されること
   *   4. プロジェクト全体のフルバックアップが作成されること
   * - 関連文書: ADR-0007, ADR-0004, ADR-0005
   */
  test('adoptProject - restructureモードにおいてルート資材がsrc配下へ集約され、クリーンルート規約構成へ完全再編されること', () => {
    fs.cpSync(repositoryPath('tests/fixtures/adopt/legacy-root'), tempBaseDir, { recursive: true });

    const result = adoptProject({
      targetDir: tempBaseDir,
      mode: 'restructure',
      silent: true,
      force: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.mode, 'restructure');

    // 1. ルートから撤去され、src/ 配下に移動していること
    assert.equal(fs.existsSync(path.join(tempBaseDir, 'package.json')), false);
    assert.equal(fs.existsSync(path.join(tempBaseDir, 'tsconfig.json')), false);
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'src', 'package.json')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'src', 'tsconfig.json')));

    // 2. ガバナンス文書とラッパーの配備
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'DEVELOPER_GUIDE.md')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'bin', 'traceweave')));

    // 3. .gitignore にクリーンルート設定が含まれること
    const gitignoreContent = fs.readFileSync(path.join(tempBaseDir, '.gitignore'), 'utf-8');
    assert.ok(gitignoreContent.includes('src/node_modules/'));
    assert.ok(gitignoreContent.includes('.traceweave-backup/'));

    // 4. フルバックアップの存在
    assert.ok(result.backupDir);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(result.backupDir!, 'backup-manifest.json'), 'utf-8')
    );
    assert.equal(manifest.mode, 'restructure');
    assert.ok(manifest.backedUpFiles.includes('package.json'));
  });

  /**
   * 【テスト概要】
   * - 対象: rollbackAdoption
   * - 条件: adoptProject 実行後に、作成されたバックアップからロールバックを実行
   * - 期待結果: 新規作成されたファイルが削除され、元のファイル配置・内容へ完全に復元されること
   * - 関連文書: ADR-0007
   */
  test('rollbackAdoption - バックアップマニフェストから変更前の状態へ決定論的に完全復元されること', () => {
    fs.cpSync(repositoryPath('tests/fixtures/adopt/legacy-root'), tempBaseDir, { recursive: true });
    const originalPkgContent = fs.readFileSync(path.join(tempBaseDir, 'package.json'), 'utf-8');

    const adoptResult = adoptProject({
      targetDir: tempBaseDir,
      mode: 'restructure',
      silent: true,
      force: true,
    });

    assert.equal(fs.existsSync(path.join(tempBaseDir, 'package.json')), false);
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'src', 'package.json')));
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'docs')));

    // ロールバック実行
    rollbackAdoption(adoptResult.backupDir!, true);

    // 元の状態に戻っていること
    assert.ok(fs.existsSync(path.join(tempBaseDir, 'package.json')));
    assert.equal(fs.readFileSync(path.join(tempBaseDir, 'package.json'), 'utf-8'), originalPkgContent);
    // 新設された docs/ や DEVELOPER_GUIDE.md は削除されていること
    assert.equal(fs.existsSync(path.join(tempBaseDir, 'DEVELOPER_GUIDE.md')), false);
    assert.equal(fs.existsSync(path.join(tempBaseDir, 'docs', 'needs', 'NEED-0001.md')), false);
  });
});
