#!/usr/bin/env tsx
/**
 * TraceWeave Adoption Engine (scripts/adopt-traceweave.ts)
 *
 * 異種プロジェクトに対して TraceWeave のトレーサビリティ基盤を適用するスクリプト。
 * - overlay (解析・一時適用モード): 既存構造を温存し、docs/ とラッパーをアドオン
 * - restructure (完全再構成モード): クリーンルート規約に沿って資材を src/ へ再編
 * - 破壊的変更前の事前バックアップ・マニフェスト記録・決定論的ロールバック
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adoptProject,
  rollbackAdoption,
  probeProject,
  createBackup,
  type AdoptionMode,
  type AdoptionOptions,
} from '../src/application/adopt-project.js';

export { adoptProject, rollbackAdoption, probeProject, createBackup, AdoptionMode, AdoptionOptions };

function runCli() {
  const args = process.argv.slice(2);
  const options: AdoptionOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mode' && i + 1 < args.length) {
      options.mode = args[++i] as AdoptionMode;
    } else if (arg === '--backup-dir' && i + 1 < args.length) {
      options.backupDir = args[++i];
    } else if (arg === '--rollback' && i + 1 < args.length) {
      options.rollbackPath = args[++i];
    } else if (arg === '--project-name' && i + 1 < args.length) {
      options.projectName = args[++i];
    } else if (arg === '--no-backup') {
      options.noBackup = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--silent') {
      options.silent = true;
    } else if (!arg.startsWith('-') && !options.targetDir) {
      options.targetDir = arg;
    }
  }

  if (options.rollbackPath) {
    rollbackAdoption(options.rollbackPath, options.silent);
    process.exit(0);
  }

  try {
    adoptProject(options);
    process.exit(0);
  } catch (err: any) {
    console.error(`\x1b[31mError during adoption: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runCli();
}
