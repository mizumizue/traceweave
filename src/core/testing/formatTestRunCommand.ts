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
