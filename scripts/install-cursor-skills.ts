import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  installCursorSkills,
  type InstallCursorSkillsOptions,
  type InstallCursorSkillsResult,
} from '../src/infrastructure/cursor/installCursorSkills.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv: string[]): InstallCursorSkillsOptions {
  const opts: InstallCursorSkillsOptions = {
    repoRoot: REPO_ROOT,
    target: 'personal',
    withRules: false,
    withAgents: false,
    dryRun: false,
  };

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
    } else if (arg === '--with-agents') {
      opts.withAgents = true;
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
  --with-agents               Also copy .cursor/agents/traceweave-*.md
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
  if (result.targetAgentsDir && result.agentsInstalled.length > 0) {
    console.log(`${prefix}Agents -> ${result.targetAgentsDir}`);
    for (const name of result.agentsInstalled) {
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
