import fs from 'node:fs';
import path from 'node:path';

export const TEST_CASE_ID_PATTERN = /^TC-\d{4}$/;

export function assertTestCaseId(testCaseId: string): void {
  if (!TEST_CASE_ID_PATTERN.test(testCaseId)) {
    throw new Error(`Invalid test case id "${testCaseId}". Expected format TC-0000.`);
  }
}

export function parseTestCaseFilter(argv: readonly string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag !== '--tc' && flag !== '--test-case') continue;

    const value = argv[i + 1];
    if (!value || value.startsWith('-')) {
      throw new Error(`${flag} requires a test case id (for example TC-0033).`);
    }

    assertTestCaseId(value);
    return value;
  }

  return undefined;
}

export function formatTestRunCommand(testCaseId?: string): string {
  if (testCaseId) {
    assertTestCaseId(testCaseId);
    return `npm --prefix src test -- --tc ${testCaseId}`;
  }
  return 'npm --prefix src test';
}

export function testNamePatternForCase(testCaseId: string): string {
  assertTestCaseId(testCaseId);
  return `^${testCaseId}:`;
}

export function testFileDeclaresCase(fileContent: string, testCaseId: string): boolean {
  assertTestCaseId(testCaseId);
  const linePattern = new RegExp(`^\\s*test\\s*\\(\\s*[\`'"]${testCaseId}:`);
  return fileContent.split('\n').some(line => linePattern.test(line));
}

export function resolveTestFilesForCase(testsDir: string, testCaseId: string): string[] {
  assertTestCaseId(testCaseId);
  const matches: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith('.test.ts')) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      if (testFileDeclaresCase(content, testCaseId)) {
        matches.push(fullPath);
      }
    }
  };

  walk(testsDir);
  return matches.sort();
}
