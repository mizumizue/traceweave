import fs from 'node:fs';
import path from 'node:path';
import type { AdoptionMode, AdoptionOptions, BackupManifest, ProjectProbeResult } from './types.js';
import { probeProject } from './probe.js';
import { createBackup } from './backup.js';
import { generateStarterDocs, generateBinWrappers, generateCursorRules, generateMcpConfig } from './templates.js';
import { copyQualityCursorAssets, generateQualityKitFiles } from './quality-kit.js';

// -----------------------------------------------------------------------------
// 4. Adoption Executor: 適用実行
// -----------------------------------------------------------------------------
export function adoptProject(options: AdoptionOptions = {}): {
  success: boolean;
  mode: AdoptionMode;
  targetDir: string;
  backupDir?: string;
  createdFiles: string[];
  probe: ProjectProbeResult;
} {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const mode = options.mode || 'overlay';
  const silent = options.silent || false;

  if (!silent) {
    console.log(`\n🚀 Initializing TraceWeave Adoption in "${targetDir}" [Mode: ${mode}]...`);
  }

  // 1. Probe target
  const probe = probeProject(targetDir);
  if (!silent) {
    console.log(`  - Project Name: ${probe.projectName}`);
    console.log(`  - Detected Languages: ${probe.languages.length > 0 ? probe.languages.join(', ') : 'None / Generic'}`);
    console.log(`  - Test Framework: ${probe.testFramework || 'Unknown / Not detected'}`);
    console.log(`  - Git Repository: ${probe.hasGit ? (probe.isGitDirty ? '⚠ Dirty tree (uncommitted changes)' : '✔ Clean') : 'Not a git repo'}`);
  }

  if (probe.isGitDirty && !options.force && mode === 'restructure') {
    throw new Error(
      'Git working directory has uncommitted changes. Please commit or stash changes before running full restructure, or use --force.'
    );
  }

  if (options.dryRun) {
    if (!silent) {
      console.log(`\n🔍 [DRY RUN] Plan for mode "${mode}":`);
      console.log(`  - Would backup existing assets to: ${options.backupDir || '.traceweave-backup/<timestamp>_' + mode}`);
      console.log(`  - Would create TraceWeave V-Model docs (docs/needs, docs/requirements, etc.)`);
      console.log(`  - Would install bin/traceweave wrappers`);
      console.log(`  - Would install .cursor/rules`);
      console.log(`  - Would install .cursor/mcp.json`);
      console.log(`  - Would install quality kit (TC-0002, test capture script, CI workflow, review skills)`);
      if (mode === 'restructure') {
        console.log(`  - Would migrate root source files to src/ and apply Clean-Root structure`);
      }
    }
    return {
      success: true,
      mode,
      targetDir,
      createdFiles: [],
      probe,
    };
  }

  // 2. Backup
  let backupDir: string | undefined;
  let manifest: BackupManifest | undefined;
  if (!options.noBackup) {
    const backupRes = createBackup(targetDir, mode, options.backupDir);
    backupDir = backupRes.backupDir;
    manifest = backupRes.manifest;
    if (!silent) {
      console.log(`\n📦 Safe backup created at: ${backupDir}`);
      console.log(`   (Backed up ${manifest.backedUpFiles.length} root entry/entries)`);
    }
  }

  const createdFiles: string[] = [];

  // Helper to write file and track
  const writeFileTracked = (relPath: string, content: string, chmodExec = false) => {
    const fullPath = path.join(targetDir, relPath);
    const existed = fs.existsSync(fullPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    if (chmodExec) {
      try {
        fs.chmodSync(fullPath, 0o755);
      } catch {
        // ignore chmod on windows
      }
    }
    if (!existed) {
      createdFiles.push(relPath);
    }
  };

  // 3. Generate Docs (V-Model Skeleton)
  const starterDocs = generateStarterDocs(options.projectName || probe.projectName, probe.testFramework);
  for (const [relPath, content] of Object.entries(starterDocs)) {
    // Only write if doesn't exist, to prevent clobbering existing docs
    const fullPath = path.join(targetDir, relPath);
    if (!fs.existsSync(fullPath)) {
      writeFileTracked(relPath, content);
    }
  }

  // 4. Generate Bin Wrappers
  const binWrappers = generateBinWrappers();
  for (const [relPath, content] of Object.entries(binWrappers)) {
    const isBash = relPath === 'bin/traceweave';
    writeFileTracked(relPath, content, isBash);
  }

  // 5. Generate Cursor Rules
  const cursorRules = generateCursorRules();
  for (const [relPath, content] of Object.entries(cursorRules)) {
    writeFileTracked(relPath, content);
  }

  // 5b. Generate Cursor MCP config (only if missing)
  const mcpConfigPath = path.join(targetDir, '.cursor', 'mcp.json');
  if (!fs.existsSync(mcpConfigPath)) {
    writeFileTracked('.cursor/mcp.json', generateMcpConfig());
  }

  // 5c. Quality kit (TC naming, report capture, CI, review skills)
  const qualityKit = generateQualityKitFiles(probe);
  for (const [relPath, content] of Object.entries(qualityKit)) {
    const fullPath = path.join(targetDir, relPath);
    if (!fs.existsSync(fullPath)) {
      writeFileTracked(relPath, content);
    }
  }
  const qualityAssets = copyQualityCursorAssets(targetDir);
  for (const rel of qualityAssets) {
    if (!createdFiles.includes(rel)) {
      createdFiles.push(rel);
    }
  }

  // 6. Mode: Restructure (クリーンルート化)
  if (mode === 'restructure') {
    if (!silent) console.log('\n🧹 Performing full project restructuring (Clean Root)...');

    const srcDir = path.join(targetDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // Move package.json and tsconfig.json to src if they exist at root
    const rootPkg = path.join(targetDir, 'package.json');
    const srcPkg = path.join(srcDir, 'package.json');
    if (fs.existsSync(rootPkg) && !fs.existsSync(srcPkg)) {
      fs.renameSync(rootPkg, srcPkg);
      if (!silent) console.log('  - Moved package.json -> src/package.json');
    }

    const rootTsconfig = path.join(targetDir, 'tsconfig.json');
    const srcTsconfig = path.join(srcDir, 'tsconfig.json');
    if (fs.existsSync(rootTsconfig) && !fs.existsSync(srcTsconfig)) {
      fs.renameSync(rootTsconfig, srcTsconfig);
      if (!silent) console.log('  - Moved tsconfig.json -> src/tsconfig.json');
    }

    // Add .gitignore rules for clean root
    const gitignorePath = path.join(targetDir, '.gitignore');
    const ignoreRules = [
      '',
      '# TraceWeave & Clean Root',
      'src/node_modules/',
      'src/dist/',
      '.traceweave-backup/',
      '.cache/',
      'reports/test-results.json',
      '',
    ].join('\n');

    if (fs.existsSync(gitignorePath)) {
      const existing = fs.readFileSync(gitignorePath, 'utf-8');
      if (!existing.includes('src/node_modules/')) {
        fs.appendFileSync(gitignorePath, ignoreRules, 'utf-8');
      }
    } else {
      writeFileTracked('.gitignore', ignoreRules);
    }

    // Write DEVELOPER_GUIDE.md if missing
    const devGuidePath = path.join(targetDir, 'DEVELOPER_GUIDE.md');
    if (!fs.existsSync(devGuidePath)) {
      const guideContent = `# Developer Guide - ${probe.projectName}\n\nThis project follows the TraceWeave Clean-Root convention and Doc-First V-Model workflow.\n\n- Documents: \`docs/\`\n- Source & Dependencies: \`src/\`\n- CLI Wrapper: \`./bin/traceweave\`\n`;
      writeFileTracked('DEVELOPER_GUIDE.md', guideContent);
    }
  }

  // Update manifest with created files
  if (manifest && backupDir) {
    manifest.createdFiles = createdFiles;
    fs.writeFileSync(
      path.join(backupDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  if (!silent) {
    console.log(`\n\x1b[32m✔ TraceWeave successfully applied in [${mode}] mode!\x1b[0m`);
    console.log(`  - Files created: ${createdFiles.length}`);
    console.log(`  - Quality setup guide: docs/ADOPT_QUALITY_SETUP.md`);
    console.log(`  - To verify docs schema:  ./bin/traceweave check (or npx traceweave check)`);
    console.log(`  - To verify quality kit:    ./bin/traceweave adopt-quality-check`);
    if (backupDir) {
      console.log(`  - To rollback if needed:   ./bin/traceweave adopt --rollback "${backupDir}"`);
    }
    console.log('');
  }

  return {
    success: true,
    mode,
    targetDir,
    backupDir,
    createdFiles,
    probe,
  };
}
