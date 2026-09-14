import fs from 'node:fs';
import path from 'node:path';
import type { AdoptionMode, BackupManifest } from './types.js';
import { copyRecursiveSync } from './fs-utils.js';

// -----------------------------------------------------------------------------
// 2. Backup & Rollback: バックアップとロールバック
// -----------------------------------------------------------------------------
export function createBackup(
  targetDir: string,
  mode: AdoptionMode,
  customBackupDir?: string
): { backupDir: string; manifest: BackupManifest } {
  const resolvedTarget = path.resolve(targetDir);
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const defaultDir = path.join(resolvedTarget, '.traceweave-backup', `${timestamp}_${mode}`);
  const backupDir = customBackupDir ? path.resolve(customBackupDir) : defaultDir;

  fs.mkdirSync(backupDir, { recursive: true });

  const backedUpFiles: string[] = [];
  const entriesToBackup = mode === 'restructure'
    ? fs.readdirSync(resolvedTarget).filter(e => e !== '.git' && e !== 'node_modules' && e !== '.traceweave-backup')
    : ['docs', 'bin', '.cursor', 'scripts', 'DEVELOPER_GUIDE.md', 'SYSTEM_OVERVIEW.md'].filter(e =>
        fs.existsSync(path.join(resolvedTarget, e))
      );

  for (const entry of entriesToBackup) {
    const srcPath = path.join(resolvedTarget, entry);
    const destPath = path.join(backupDir, entry);
    copyRecursiveSync(srcPath, destPath);
    backedUpFiles.push(entry);
  }

  const manifest: BackupManifest = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    mode,
    targetDir: resolvedTarget,
    backupDir,
    backedUpFiles,
    createdFiles: [],
  };

  fs.writeFileSync(
    path.join(backupDir, 'backup-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return { backupDir, manifest };
}

export function rollbackAdoption(backupPath: string, silent = false): void {
  const resolved = path.resolve(backupPath);
  const manifestPath = fs.existsSync(path.join(resolved, 'backup-manifest.json'))
    ? path.join(resolved, 'backup-manifest.json')
    : resolved;

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found: ${manifestPath}`);
  }

  const manifestDir = path.dirname(manifestPath);
  const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const targetDir = manifest.targetDir;

  if (!silent) {
    console.log(`\n⏪ Rolling back TraceWeave changes in "${targetDir}" from backup "${manifestDir}"...`);
  }

  // 1. Remove files created by adopt
  for (const created of manifest.createdFiles) {
    const fullCreated = path.join(targetDir, created);
    if (fs.existsSync(fullCreated)) {
      fs.rmSync(fullCreated, { recursive: true, force: true });
    }
  }

  // 2. Restore backed up files
  for (const entry of manifest.backedUpFiles) {
    const backupSrc = path.join(manifestDir, entry);
    const restoreDest = path.join(targetDir, entry);
    if (fs.existsSync(backupSrc)) {
      if (fs.existsSync(restoreDest)) {
        fs.rmSync(restoreDest, { recursive: true, force: true });
      }
      copyRecursiveSync(backupSrc, restoreDest);
    }
  }

  if (!silent) {
    console.log(`\x1b[32m✔ Rollback completed successfully!\x1b[0m\n`);
  }
}
