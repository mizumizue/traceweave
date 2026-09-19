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

/** TC-<STRATUM>-<NNNN> or split TC-<STRATUM>-<NNNN>-<SS> where SS is 01..99 (ADR-0010). */
const TC_ID_REGEX = /^TC-(UT|ITa|ITb|ST|UAT)-(\d{4})(?:-(0[1-9]|[1-9]\d))?$/;

export const TEST_CASE_ID_PATTERN = TC_ID_REGEX;

/** Prefer full split id when matching titles and logs. */
export const TEST_CASE_ID_EXTRACT_PATTERN =
  /TC-(?:UT|ITa|ITb|ST|UAT)-\d{4}(?:-(?:0[1-9]|[1-9]\d))?/g;

export function stratumCodeForTestLevel(testLevel: TestLevel): TestCaseStratumCode {
  return TEST_LEVEL_TO_STRATUM[testLevel];
}

export function testLevelForStratumCode(code: TestCaseStratumCode): TestLevel {
  return STRATUM_TO_TEST_LEVEL[code];
}

export function parseTestCaseIdParts(
  testCaseId: string
): { stratum: TestCaseStratumCode; serial: string; splitSuffix: string | null } | null {
  const match = testCaseId.match(TC_ID_REGEX);
  if (!match) return null;
  return {
    stratum: match[1] as TestCaseStratumCode,
    serial: match[2],
    splitSuffix: match[3] ?? null,
  };
}

export function parseTestCaseStratumCode(testCaseId: string): TestCaseStratumCode | null {
  return parseTestCaseIdParts(testCaseId)?.stratum ?? null;
}

/** Base id without split suffix (TC-ITb-0001-03 → TC-ITb-0001). */
export function baseTestCaseId(testCaseId: string): string | null {
  const parts = parseTestCaseIdParts(testCaseId);
  if (!parts) return null;
  return `TC-${parts.stratum}-${parts.serial}`;
}

export function isSplitTestCaseId(testCaseId: string): boolean {
  return parseTestCaseIdParts(testCaseId)?.splitSuffix !== null;
}

export function assertTestCaseId(testCaseId: string): void {
  if (!TEST_CASE_ID_PATTERN.test(testCaseId)) {
    throw new Error(
      `Invalid test case id "${testCaseId}". Expected TC-UT-0001 or split TC-UT-0001-01 (stratum + 4 digits, optional -01..99).`
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

/** Formal execution evidence: test title must declare TC id at the start (ADR-0011). */
export function formalTestCaseIdFromTitle(testTitle: string): string | null {
  const match = testTitle.match(
    /^(TC-(?:UT|ITa|ITb|ST|UAT)-\d{4}(?:-(?:0[1-9]|[1-9]\d))?):/
  );
  return match ? match[1] : null;
}

export function escapeTestCaseIdForRegExp(testCaseId: string): string {
  return testCaseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
