import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 走査対象ディレクトリ・ファイル
const TARGET_DIRS = ['docs', 'src', 'tests', 'scripts'];
const TARGET_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
]);

// 除外ディレクトリ・ファイル
const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.cache',
  '.git',
  '.traceweave-backup',
  'reports',
  'dist-web',
  '.tmp-build',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'validate-no-local-paths.ts', // 自スクリプト内の正規表現定義を除外
]);

// 許容されるプレースホルダー表記
const ALLOWED_PLACEHOLDERS = [
  '<username>',
  '<user>',
  '<your-username>',
  'your-username',
  '<path/to/',
  '<project-dir>',
  '<targetDir>',
];

interface PathLeakFinding {
  filePath: string;
  lineNumber: number;
  matchedText: string;
  lineContent: string;
}

export function validateNoLocalPaths(rootDir: string = ROOT): {
  passed: boolean;
  findings: PathLeakFinding[];
} {
  const findings: PathLeakFinding[] = [];
  const currentUsername = os.userInfo().username;

  // 検出用正規表現
  // 1. Windows Drive + Users path: e.g. C:\Users\xxx or c:/Users/xxx
  const winUserPathRegex = /[a-zA-Z]:[/\\]Users[/\\]([^/\\\s"'>`]+)/gi;

  // 2. Unix / macOS / Linux home path: e.g. /Users/xxx or /home/xxx
  const unixHomePathRegex = /(?:^|[\s"'>`(=])\/(?:Users|home)\/([^/\\\s"'>`]+)/gi;

  function isAllowed(matchedSnippet: string): boolean {
    const lower = matchedSnippet.toLowerCase();
    return ALLOWED_PLACEHOLDERS.some((p) => lower.includes(p.toLowerCase()));
  }

  function scanFile(filePath: string) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check Windows path
      winUserPathRegex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = winUserPathRegex.exec(line)) !== null) {
        const fullMatch = match[0];
        const userPart = match[1];
        if (!isAllowed(fullMatch) && !isAllowed(userPart)) {
          findings.push({
            filePath: relPath,
            lineNumber: lineNum,
            matchedText: fullMatch,
            lineContent: line.trim(),
          });
        }
      }

      // Check Unix path
      unixHomePathRegex.lastIndex = 0;
      while ((match = unixHomePathRegex.exec(line)) !== null) {
        const fullMatch = match[0].trim();
        const userPart = match[1];
        if (!isAllowed(fullMatch) && !isAllowed(userPart)) {
          findings.push({
            filePath: relPath,
            lineNumber: lineNum,
            matchedText: fullMatch,
            lineContent: line.trim(),
          });
        }
      }

      // Check current username in absolute path contexts if username is distinct
      if (currentUsername && currentUsername.length >= 3) {
        if (
          (line.includes(`/${currentUsername}/`) ||
            line.includes(`\\${currentUsername}\\`)) &&
          !isAllowed(line)
        ) {
          // 重複登録を防止
          if (
            !findings.some(
              (f) => f.filePath === relPath && f.lineNumber === lineNum
            )
          ) {
            findings.push({
              filePath: relPath,
              lineNumber: lineNum,
              matchedText: currentUsername,
              lineContent: line.trim(),
            });
          }
        }
      }
    });
  }

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(entry.name)) continue;
        const ext = path.extname(entry.name);
        if (TARGET_EXTENSIONS.has(ext)) {
          scanFile(fullPath);
        }
      }
    }
  }

  // 1. Walk target dirs
  for (const dirName of TARGET_DIRS) {
    const targetPath = path.join(rootDir, dirName);
    if (fs.existsSync(targetPath)) {
      walk(targetPath);
    }
  }

  // 2. Scan root markdown files
  const rootEntries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      scanFile(path.join(rootDir, entry.name));
    }
  }

  return {
    passed: findings.length === 0,
    findings,
  };
}

// CLI direct execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log('🔍 Validating absence of local absolute paths and environment leaks...');
  const { passed, findings } = validateNoLocalPaths(ROOT);

  if (!passed) {
    console.error(`\n\x1b[31m✖ Local user path leaks detected (${findings.length} findings):\x1b[0m`);
    for (const f of findings) {
      console.error(`  - \x1b[33m${f.filePath}:${f.lineNumber}\x1b[0m: "${f.matchedText}"`);
      console.error(`    \x1b[90m${f.lineContent}\x1b[0m`);
    }
    console.error('\n\x1b[31mFAIL: Replace local paths with relative paths or <placeholders>.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ PASS: No local user paths or environment-specific leaks detected!\x1b[0m\n');
  }
}
