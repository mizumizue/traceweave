import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SKILL_FILE = 'SKILL.md';
export const BUNDLED_SKILL_PREFIX = 'traceweave-';
export const BUNDLED_AGENT_PREFIX = 'traceweave-';

export interface InstallCursorSkillsOptions {
  repoRoot: string;
  target: 'personal' | 'project';
  projectDir?: string;
  withRules?: boolean;
  withAgents?: boolean;
  dryRun?: boolean;
  /** When true, skip copying a file if the destination already exists. */
  skipExisting?: boolean;
}

export interface InstallCursorSkillsResult {
  skillsInstalled: string[];
  skillsSkipped: string[];
  rulesInstalled: string[];
  agentsInstalled: string[];
  createdRelativePaths: string[];
  targetSkillsDir: string;
  targetRulesDir: string | null;
  targetAgentsDir: string | null;
}

function ensureDir(dir: string, dryRun: boolean): void {
  if (dryRun) return;
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileTracked(
  src: string,
  dest: string,
  dryRun: boolean,
  skipExisting: boolean,
  createdRelativePaths: string[],
  destRoot: string
): void {
  if (skipExisting && fs.existsSync(dest)) return;
  const existed = fs.existsSync(dest);
  if (dryRun) {
    if (!existed) {
      createdRelativePaths.push(path.relative(destRoot, dest).replace(/\\/g, '/'));
    }
    return;
  }
  ensureDir(path.dirname(dest), dryRun);
  fs.copyFileSync(src, dest);
  if (!existed) {
    createdRelativePaths.push(path.relative(destRoot, dest).replace(/\\/g, '/'));
  }
}

function copyTreeTracked(
  srcDir: string,
  destDir: string,
  dryRun: boolean,
  skipExisting: boolean,
  createdRelativePaths: string[],
  destRoot: string
): void {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (!dryRun) ensureDir(destPath, dryRun);
      copyTreeTracked(srcPath, destPath, dryRun, skipExisting, createdRelativePaths, destRoot);
    } else if (entry.isFile()) {
      copyFileTracked(srcPath, destPath, dryRun, skipExisting, createdRelativePaths, destRoot);
    }
  }
}

export function listBundledSkills(sourceSkillsDir: string): string[] {
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

export function listBundledAgents(sourceAgentsDir: string): string[] {
  if (!fs.existsSync(sourceAgentsDir)) return [];
  return fs
    .readdirSync(sourceAgentsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(BUNDLED_AGENT_PREFIX) && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}

function resolveTargetDirs(
  options: InstallCursorSkillsOptions,
  repoRoot: string
): { skillsDir: string; rulesDir: string | null; agentsDir: string | null; destRoot: string } {
  if (options.target === 'personal') {
    const cursorHome = path.join(os.homedir(), '.cursor');
    return {
      skillsDir: path.join(cursorHome, 'skills'),
      rulesDir: options.withRules ? path.join(cursorHome, 'rules') : null,
      agentsDir: options.withAgents ? path.join(cursorHome, 'agents') : null,
      destRoot: cursorHome,
    };
  }

  const projectDir = path.resolve(options.projectDir || repoRoot);
  return {
    skillsDir: path.join(projectDir, '.cursor', 'skills'),
    rulesDir: options.withRules ? path.join(projectDir, '.cursor', 'rules') : null,
    agentsDir: options.withAgents ? path.join(projectDir, '.cursor', 'agents') : null,
    destRoot: projectDir,
  };
}

export function installCursorSkills(
  options: InstallCursorSkillsOptions
): InstallCursorSkillsResult {
  const repoRoot = path.resolve(options.repoRoot);
  const isDryRun = options.dryRun ?? false;
  const skipExisting = options.skipExisting ?? false;

  const sourceSkillsDir = path.join(repoRoot, '.cursor', 'skills');
  const sourceRulesDir = path.join(repoRoot, '.cursor', 'rules');
  const sourceAgentsDir = path.join(repoRoot, '.cursor', 'agents');
  const { skillsDir, rulesDir, agentsDir, destRoot } = resolveTargetDirs(options, repoRoot);

  const skillsInstalled: string[] = [];
  const skillsSkipped: string[] = [];
  const rulesInstalled: string[] = [];
  const agentsInstalled: string[] = [];
  const createdRelativePaths: string[] = [];

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

    copyTreeTracked(srcSkillDir, destSkillDir, isDryRun, skipExisting, createdRelativePaths, destRoot);
    skillsInstalled.push(skillName);
  }

  if (rulesDir && options.withRules) {
    ensureDir(rulesDir, isDryRun);
    if (fs.existsSync(sourceRulesDir)) {
      for (const entry of fs.readdirSync(sourceRulesDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.mdc')) continue;
        const src = path.join(sourceRulesDir, entry.name);
        const dest = path.join(rulesDir, entry.name);
        copyFileTracked(src, dest, isDryRun, skipExisting, createdRelativePaths, destRoot);
        rulesInstalled.push(entry.name);
      }
    }
  }

  if (agentsDir && options.withAgents) {
    ensureDir(agentsDir, isDryRun);
    for (const agentFile of listBundledAgents(sourceAgentsDir)) {
      const src = path.join(sourceAgentsDir, agentFile);
      const dest = path.join(agentsDir, agentFile);
      copyFileTracked(src, dest, isDryRun, skipExisting, createdRelativePaths, destRoot);
      agentsInstalled.push(agentFile);
    }
  }

  return {
    skillsInstalled,
    skillsSkipped,
    rulesInstalled,
    agentsInstalled,
    createdRelativePaths,
    targetSkillsDir: skillsDir,
    targetRulesDir: rulesDir,
    targetAgentsDir: agentsDir,
  };
}
