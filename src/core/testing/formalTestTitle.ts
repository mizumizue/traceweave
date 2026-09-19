import { assertTestCaseId } from './testCaseId.js';

/** Machine-readable formal test title (`TC-xxxx: …`) for TAP / Playwright evidence (ADR-0011). */
export function formalTestTitle(testCaseId: string, description: string): string {
  assertTestCaseId(testCaseId);
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error('formalTestTitle requires a non-empty description.');
  }
  return `${testCaseId}: ${trimmed}`;
}
