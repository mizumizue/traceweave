import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ルート直下に配置を許可するディレクトリ（Allowlist）
const ALLOWED_DIRECTORIES = new Set([
  'agent-logs',
  'bin',
  'docs',
  'fixtures',
  'reports',
  'scripts',
  'src',
  'tests',
  '.cursor',
  '.git',
  '.traceweave-backup',
]);

// ルート直下に配置を許可するファイル（Allowlist）
const ALLOWED_FILES = new Set([
  'README.md',
  'USER_GUIDE.md',
  'INSTALL_GUIDE.md',
  'DEVELOPER_GUIDE.md',
  'ARCHITECTURE.md',
  'LICENSE',
  '.cursorignore',
  '.gitignore',
  '.gitattributes',
]);

export interface CleanRootViolation {
  name: string;
  type: 'directory' | 'file';
  reason: string;
}

export function validateCleanRoot(rootDir: string = ROOT): {
  passed: boolean;
  violations: CleanRootViolation[];
} {
  const violations: CleanRootViolation[] = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;

    if (entry.isDirectory()) {
      if (!ALLOWED_DIRECTORIES.has(name)) {
        let reason = 'Unregistered directory on repository root.';
        if (name === 'node_modules' || name === 'dist') {
          reason = `Development artifacts must be encapsulated in 'src/' (ADR-0005).`;
        } else if (name === '.cache') {
          reason = `Cache directory must be located in 'src/.cache/' (ADR-0004, ADR-0005).`;
        }
        violations.push({ name, type: 'directory', reason });
      }
    } else if (entry.isFile()) {
      if (!ALLOWED_FILES.has(name)) {
        let reason = 'Unregistered file on repository root.';
        if (
          name === 'package.json' ||
          name === 'package-lock.json' ||
          name === 'tsconfig.json'
        ) {
          reason = `Project manifest must be encapsulated in 'src/' (ADR-0005).`;
        } else if (
          name === 'index.html' ||
          name.includes('vite.config') ||
          name.includes('tailwind.config')
        ) {
          reason = `Web build assets must be encapsulated in 'src/web/' (ADR-0004).`;
        }
        violations.push({ name, type: 'file', reason });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

// CLI direct execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log('🏛️  Validating Clean-Root repository topology (ADR-0004, ADR-0005)...');
  const { passed, violations } = validateCleanRoot(ROOT);

  if (!passed) {
    console.error(`\n\x1b[31m✖ Clean-Root violations detected on repository root (${violations.length} items):\x1b[0m`);
    for (const v of violations) {
      console.error(`  - \x1b[33m${v.name}\x1b[0m (${v.type}): ${v.reason}`);
    }
    console.error('\n\x1b[31mFAIL: Encapsulate all implementation assets into src/ and remove root clutter.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ PASS: Repository root is completely clean and follows Clean-Root standards!\x1b[0m\n');
  }
}
