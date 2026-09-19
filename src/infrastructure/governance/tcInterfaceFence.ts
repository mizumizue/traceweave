import type { TestLevel } from '../../core/models/types.js';

/** integration_internal and above: Preconditions / Steps / Expected must not read like test code. */
export const TC_INTERFACE_FENCE_LEVELS: TestLevel[] = [
  'integration_internal',
  'integration_external',
  'system',
  'acceptance',
];

const DOC_ID_BACKTICK =
  /`(NEED|REQ|SPEC|DSN|ADR|QA|TC|ACT|UC|GLO)-\d{4}(?:-\d{2})?`/;

const TC_BACKTICK_ALLOWLIST = new Set([
  'functional',
  'non_functional',
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
]);

const TC_INTERFACE_BANNED: { label: string; re: RegExp }[] = [
  { label: 'implementation or test file path', re: /(?:tests?|src)\/[a-zA-Z0-9_\-/]+\.(?:ts|js|tsx|jsx|mjs|cjs)/ },
  { label: 'fixtures path as an operation', re: /fixtures\/[a-zA-Z0-9_\-/]+/ },
  { label: 'test runner name', re: /\b(?:jest|vitest|mocha|pytest|playwright)\b/i },
  { label: 'mocking directive', re: /\bmock(?:s|ed|ing)?\b/i },
  { label: 'npm test invocation', re: /\bnpm\s+--prefix\s+src\s+test\b/i },
  { label: 'strict equality or typeof-style check', re: /\b===\s*['"`]|typeof\s+\w+/ },
  { label: 'dotted implementation call', re: /\b[A-Z][A-Za-z0-9]*\.[a-z][a-zA-Z0-9]+/ },
];

const IMPLEMENTATION_TYPE_SUFFIX =
  /\b[A-Z][a-zA-Z0-9]*(?:Analyzer|Builder|Registry|Scorer|Parser|Loader|Graph|Report|Catalog)\b/g;

const CAMEL_CASE_IDENTIFIER = /\b[a-z][a-z0-9]*[A-Z][a-zA-Z0-9]+\b/g;

const SNAKE_CASE_IDENTIFIER = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;

function isDocIdBacktick(match: string): boolean {
  return DOC_ID_BACKTICK.test(match);
}

function findBacktickCodeTokens(sectionText: string): string[] {
  const leaks: string[] = [];
  const backtickMatches = sectionText.match(/`[^`]+`/g) ?? [];
  for (const match of backtickMatches) {
    if (isDocIdBacktick(match)) continue;
    const inner = match.slice(1, -1);
    if (TC_BACKTICK_ALLOWLIST.has(inner)) continue;
    if (/^[a-z]+_[a-z0-9_]+$/.test(inner)) {
      leaks.push(`code-like property ${match}`);
      continue;
    }
    if (/^[a-z]+[A-Z][a-zA-Z0-9]*$/.test(inner)) {
      leaks.push(`code-like property ${match}`);
      continue;
    }
    if (/^[A-Z][a-zA-Z0-9]+$/.test(inner)) {
      leaks.push(`implementation identifier ${match}`);
    }
  }
  return leaks;
}

function findBareCodeIdentifiers(sectionText: string): string[] {
  const leaks: string[] = [];
  const withoutBackticks = sectionText.replace(/`[^`]+`/g, ' ');
  for (const token of withoutBackticks.match(IMPLEMENTATION_TYPE_SUFFIX) ?? []) {
    leaks.push(`implementation type "${token}"`);
  }
  for (const token of withoutBackticks.match(CAMEL_CASE_IDENTIFIER) ?? []) {
    if (token.length < 5) continue;
    leaks.push(`code-like identifier "${token}"`);
  }
  for (const token of withoutBackticks.match(SNAKE_CASE_IDENTIFIER) ?? []) {
    if (token === 'non_functional') continue;
    leaks.push(`code-like identifier "${token}"`);
  }
  return leaks;
}

/**
 * Deterministic interface-fence leaks for TC executable sections (not Objective).
 * SPEC-0029 / ADR-0012 / DSN-0024.
 */
export function findTestCaseInterfaceFenceLeaks(
  sectionText: string,
  testLevel: TestLevel
): string[] {
  if (!TC_INTERFACE_FENCE_LEVELS.includes(testLevel)) {
    return [];
  }
  const leaks: string[] = [];
  for (const { label, re } of TC_INTERFACE_BANNED) {
    if (re.test(sectionText)) {
      leaks.push(label);
    }
  }
  leaks.push(...findBacktickCodeTokens(sectionText));
  leaks.push(...findBareCodeIdentifiers(sectionText));
  return [...new Set(leaks)];
}
