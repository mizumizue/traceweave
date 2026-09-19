import fs from 'node:fs';
import path from 'node:path';
import {
  assertTestCaseId,
  escapeTestCaseIdForRegExp,
  TEST_CASE_ID_PATTERN,
} from './testCaseId.js';
import { testCaseIdToCatalogKey } from './tcIdCatalog.js';

export { assertTestCaseId, TEST_CASE_ID_PATTERN };

export function parseTestCaseFilter(argv: readonly string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag !== '--tc' && flag !== '--test-case') continue;

    const value = argv[i + 1];
    if (!value || value.startsWith('-')) {
      throw new Error(`${flag} requires a test case id (for example TC-ITb-0001).`);
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
  const escapedId = escapeTestCaseIdForRegExp(testCaseId);
  const linePattern = new RegExp(`^\\s*test\\s*\\(\\s*[\`'"]${escapedId}:`);
  if (fileContent.split('\n').some(line => linePattern.test(line))) {
    return true;
  }

  const catalogKey = testCaseIdToCatalogKey(testCaseId);
  const formalPatterns = [
    new RegExp(
      `test\\s*\\(\\s*formalTestTitle\\(\\s*[\`'"]${escapedId}[\`'"]`
    ),
    new RegExp(`test\\s*\\(\\s*formalTestTitle\\(\\s*TC_IDS\\.${catalogKey}\\b`),
  ];
  return formalPatterns.some(pattern => pattern.test(fileContent));
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
