import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SKILL_FILE = 'SKILL.md';
const BUNDLED_SKILL_PREFIX = 'traceweave-';

export interface InstallCursorSkillsOptions {
  repoRoot?: string;
  target: 'personal' | 'project';
  projectDir?: string;
  withRules?: boolean;
  dryRun?: boolean;
}

export interface InstallCursorSkillsResult {
  skillsInstalled: string[];
  skillsSkipped: string[];
  rulesInstalled: string[];
  targetSkillsDir: string;
  targetRulesDir: string | null;
}

function ensureDir(dir: string, dryRun: boolean): void {
  if (dryRun) return;
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src: string, dest: string, dryRun: boolean): void {
  if (dryRun) return;
  ensureDir(path.dirname(dest), dryRun);
  fs.copyFileSync(src, dest);
}

function copyTree(srcDir: string, destDir: string, dryRun: boolean): void {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      ensureDir(destPath, dryRun);
      copyTree(srcPath, destPath, dryRun);
    } else if (entry.isFile()) {
      copyFile(srcPath, destPath, dryRun);
    }
  }
}

function listBundledSkills(sourceSkillsDir: string): string[] {
  if (!fs.existsSync(sourceSkillsDir)) return [];
  return fs
    .readdirSync(sourceSkillsDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith(BUNDLED_SKILL_PREFIX) &&
        fs.existsSync(path.join(sourceSkillsDir, entry.name, SKILL_FILE))
    )
    .map((entry) => entry.name)
    .sort();
}

function resolveTargetDirs(
  options: InstallCursorSkillsOptions,
  repoRoot: string
): { skillsDir: string; rulesDir: string | null } {
  if (options.target === 'personal') {
    const cursorHome = path.join(os.homedir(), '.cursor');
    return {
      skillsDir: path.join(cursorHome, 'skills'),
      rulesDir: options.withRules ? path.join(cursorHome, 'rules') : null,
    };
  }

  const projectDir = path.resolve(options.projectDir || repoRoot);
  return {
    skillsDir: path.join(projectDir, '.cursor', 'skills'),
    rulesDir: options.withRules ? path.join(projectDir, '.cursor', 'rules') : null,
  };
}

export function installCursorSkills(
  options: InstallCursorSkillsOptions = { target: 'personal' }
): InstallCursorSkillsResult {
  const repoRoot = path.resolve(options.repoRoot || REPO_ROOT);
  const isDryRun = options.dryRun ?? false;

  const sourceSkillsDir = path.join(repoRoot, '.cursor', 'skills');
  const sourceRulesDir = path.join(repoRoot, '.cursor', 'rules');
  const { skillsDir, rulesDir } = resolveTargetDirs(options, repoRoot);

  const skillsInstalled: string[] = [];
  const skillsSkipped: string[] = [];
  const rulesInstalled: string[] = [];

  const bundled = listBundledSkills(sourceSkillsDir);
  if (bundled.length === 0) {
    throw new Error(`No bundled skills found under ${sourceSkillsDir}`);
  }

  ensureDir(skillsDir, isDryRun);

  for (const skillName of bundled) {
    const srcSkillDir = path.join(sourceSkillsDir, skillName);
    const destSkillDir = path.join(skillsDir, skillName);
    const srcSkillFile = path.join(srcSkillDir, SKILL_FILE);

    if (!fs.existsSync(srcSkillFile)) {
      skillsSkipped.push(skillName);
      continue;
    }

    if (isDryRun) {
      skillsInstalled.push(skillName);
      continue;
    }

    ensureDir(destSkillDir, isDryRun);
    copyFile(srcSkillFile, path.join(destSkillDir, SKILL_FILE), isDryRun);

    for (const sibling of fs.readdirSync(srcSkillDir, { withFileTypes: true })) {
      if (!sibling.isFile() || sibling.name === SKILL_FILE) continue;
      copyFile(
        path.join(srcSkillDir, sibling.name),
        path.join(destSkillDir, sibling.name),
        isDryRun
      );
    }

    const srcScripts = path.join(srcSkillDir, 'scripts');
    if (fs.existsSync(srcScripts)) {
      copyTree(srcScripts, path.join(destSkillDir, 'scripts'), isDryRun);
    }

    skillsInstalled.push(skillName);
  }

  if (rulesDir && options.withRules) {
    ensureDir(rulesDir, isDryRun);
    if (fs.existsSync(sourceRulesDir)) {
      for (const entry of fs.readdirSync(sourceRulesDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.mdc')) continue;
        const src = path.join(sourceRulesDir, entry.name);
        const dest = path.join(rulesDir, entry.name);
        copyFile(src, dest, isDryRun);
        rulesInstalled.push(entry.name);
      }
    }
  }

  return {
    skillsInstalled,
    skillsSkipped,
    rulesInstalled,
    targetSkillsDir: skillsDir,
    targetRulesDir: rulesDir,
  };
}

function parseArgs(argv: string[]): InstallCursorSkillsOptions {
  const opts: InstallCursorSkillsOptions = { target: 'personal', withRules: false, dryRun: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--target' && argv[i + 1]) {
      const value = argv[++i];
      if (value !== 'personal' && value !== 'project') {
        throw new Error('--target must be "personal" or "project"');
      }
      opts.target = value;
    } else if (arg === '--project-dir' && argv[i + 1]) {
      opts.projectDir = argv[++i];
    } else if (arg === '--with-rules') {
      opts.withRules = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (opts.target === 'project' && !opts.projectDir) {
    opts.projectDir = REPO_ROOT;
  }

  return opts;
}

function printHelp(): void {
  console.log(`Usage: tsx scripts/install-cursor-skills.ts [options]

Options:
  --target personal|project   Install destination (default: personal)
  --project-dir <path>        Project root when --target project
  --with-rules                Also copy .cursor/rules/*.mdc
  --dry-run                   List actions without writing files
`);
}

function printResult(result: InstallCursorSkillsResult, dryRun: boolean): void {
  const prefix = dryRun ? '[dry-run] ' : '';
  console.log(`${prefix}Skills -> ${result.targetSkillsDir}`);
  for (const name of result.skillsInstalled) {
    console.log(`  + ${name}`);
  }
  for (const name of result.skillsSkipped) {
    console.log(`  - skipped ${name}`);
  }
  if (result.targetRulesDir && result.rulesInstalled.length > 0) {
    console.log(`${prefix}Rules -> ${result.targetRulesDir}`);
    for (const name of result.rulesInstalled) {
      console.log(`  + ${name}`);
    }
  }
  console.log(`\x1b[32mPASS: ${result.skillsInstalled.length} skill(s) ready\x1b[0m`);
}

if (process.argv[1] && process.argv[1].endsWith('install-cursor-skills.ts')) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const result = installCursorSkills(opts);
    printResult(result, opts.dryRun ?? false);
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31mFAIL: ${message}\x1b[0m`);
    process.exit(1);
  }
}
