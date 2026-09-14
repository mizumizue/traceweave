import fs from 'node:fs';
import path from 'node:path';

export interface AdoptQualityCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

const BOILERPLATE_PHRASES = [
  '正常系入力に対する戻り値および終了コードを検証する',
  'テストランナーのアサーションが成功し、エラーなく終了すること',
];

function readIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function findTestFiles(rootDir: string): string[] {
  const candidates = ['tests', 'test', 'src/tests', 'src/test'];
  const files: string[] = [];
  for (const rel of candidates) {
    const dir = path.join(rootDir, rel);
    if (!fs.existsSync(dir)) continue;
    walk(dir, files);
  }
  return files;
}

function walk(dir: string, files: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) files.push(full);
  }
}

export function checkAdoptQuality(targetDir: string): AdoptQualityCheckResult {
  const root = path.resolve(targetDir);
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredPaths = [
    'docs/test-cases/TC-0001.md',
    'docs/test-cases/TC-0002.md',
    'docs/ADOPT_QUALITY_SETUP.md',
    'scripts/traceweave-capture-test-report.mjs',
    '.github/workflows/traceweave-governance.yml',
    '.cursor/skills/traceweave-test-case-review/SKILL.md',
  ];

  for (const rel of requiredPaths) {
    if (!fs.existsSync(path.join(root, rel))) {
      errors.push(`Missing quality kit file: ${rel}`);
    }
  }

  const tc1 = readIfExists(path.join(root, 'docs/test-cases/TC-0001.md'));
  const tc2 = readIfExists(path.join(root, 'docs/test-cases/TC-0002.md'));

  if (tc1 && !tc1.includes('AC-001')) {
    errors.push('TC-0001 Expected Results must reference REQ-0001 AC-001');
  }
  if (tc2 && !tc2.includes('AC-002')) {
    errors.push('TC-0002 Expected Results must reference REQ-0001 AC-002');
  }

  for (const phrase of BOILERPLATE_PHRASES) {
    if (tc1?.includes(phrase)) {
      warnings.push(`TC-0001 still contains adopt boilerplate: "${phrase}"`);
    }
    if (tc2?.includes(phrase)) {
      warnings.push(`TC-0002 still contains adopt boilerplate: "${phrase}"`);
    }
  }

  const testFiles = findTestFiles(root);
  if (testFiles.length === 0) {
    warnings.push('No automated test files found under tests/ or test/. Add TC-xxxx named tests.');
  } else {
    const hasTc1 = testFiles.some((file) => readIfExists(file)?.includes('TC-0001'));
    const hasTc2 = testFiles.some((file) => readIfExists(file)?.includes('TC-0002'));
    if (!hasTc1) warnings.push('No test file references TC-0001 in its title or body.');
    if (!hasTc2) warnings.push('No test file references TC-0002 in its title or body.');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}
