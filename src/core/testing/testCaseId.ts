import type { TestLevel } from '../models/types.js';

export const TEST_CASE_STRATUM_CODES = ['UT', 'ITa', 'ITb', 'ST', 'UAT'] as const;
export type TestCaseStratumCode = (typeof TEST_CASE_STRATUM_CODES)[number];

const TEST_LEVEL_TO_STRATUM: Record<TestLevel, TestCaseStratumCode> = {
  unit: 'UT',
  integration_internal: 'ITa',
  integration_external: 'ITb',
  system: 'ST',
  acceptance: 'UAT',
};

const STRATUM_TO_TEST_LEVEL: Record<TestCaseStratumCode, TestLevel> = {
  UT: 'unit',
  ITa: 'integration_internal',
  ITb: 'integration_external',
  ST: 'system',
  UAT: 'acceptance',
};

/** Canonical test case document / report key: TC-<STRATUM>-<NNNN> */
export const TEST_CASE_ID_PATTERN = /^TC-(UT|ITa|ITb|ST|UAT)-\d{4}$/;

/** Extract all test case ids from free text (titles, logs, JSON). */
export const TEST_CASE_ID_EXTRACT_PATTERN = /TC-(?:UT|ITa|ITb|ST|UAT)-\d{4}/g;

export function stratumCodeForTestLevel(testLevel: TestLevel): TestCaseStratumCode {
  return TEST_LEVEL_TO_STRATUM[testLevel];
}

export function testLevelForStratumCode(code: TestCaseStratumCode): TestLevel {
  return STRATUM_TO_TEST_LEVEL[code];
}

export function parseTestCaseStratumCode(testCaseId: string): TestCaseStratumCode | null {
  const match = testCaseId.match(/^TC-(UT|ITa|ITb|ST|UAT)-\d{4}$/);
  return match ? (match[1] as TestCaseStratumCode) : null;
}

export function assertTestCaseId(testCaseId: string): void {
  if (!TEST_CASE_ID_PATTERN.test(testCaseId)) {
    throw new Error(
      `Invalid test case id "${testCaseId}". Expected format TC-UT-0001 (stratum code UT|ITa|ITb|ST|UAT + 4 digits).`
    );
  }
}

export function testCaseIdMatchesTestLevel(testCaseId: string, testLevel: TestLevel): boolean {
  const code = parseTestCaseStratumCode(testCaseId);
  if (!code) return false;
  return stratumCodeForTestLevel(testLevel) === code;
}

export function extractTestCaseIds(text: string): string[] {
  return [...text.matchAll(TEST_CASE_ID_EXTRACT_PATTERN)].map(m => m[0]);
}

export function escapeTestCaseIdForRegExp(testCaseId: string): string {
  return testCaseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
