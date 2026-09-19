import { TestLevel, TestStratumCatalog } from '../models/types.js';
import { TEST_SPEC_BOOK_LEVELS } from './testLevelLabels.js';

export function isSpecBookLevel(level: TestLevel): boolean {
  return (TEST_SPEC_BOOK_LEVELS as readonly string[]).includes(level);
}

export function resolveSpecBookLevel(
  catalog: TestStratumCatalog,
  preferred?: TestLevel | null
): TestLevel {
  if (preferred && isSpecBookLevel(preferred)) {
    const ch = catalog.chapters.find(c => c.level === preferred);
    if (ch) return preferred;
  }
  for (const level of TEST_SPEC_BOOK_LEVELS) {
    const ch = catalog.chapters.find(c => c.level === level);
    if (ch && ch.cases.length > 0) return level;
  }
  return TEST_SPEC_BOOK_LEVELS[0];
}
