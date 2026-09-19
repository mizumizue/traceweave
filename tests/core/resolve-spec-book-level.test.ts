import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSpecBookLevel, isSpecBookLevel } from '../../src/core/testing/resolveSpecBookLevel.js';
import { TestStratumCatalog } from '../../src/core/models/types.js';

function emptyCatalog(): TestStratumCatalog {
  const levels = ['unit', 'integration_internal', 'integration_external', 'system', 'acceptance'] as const;
  return {
    chapters: levels.map(level => ({
      level,
      label: level,
      shortLabel: level,
      cases: level === 'unit' ? [{ id: 'TC-UT-0001' } as any] : [],
      passedCount: 0,
      failedCount: 0,
      pendingCount: 0,
      skippedCount: 0,
      likelySufficientCount: 0,
      needsAttentionCount: 0,
    })),
    unassignedCases: [],
    totalCases: 1,
  };
}

test('isSpecBookLevel - unit は仕様書一覧の対象外', () => {
  assert.equal(isSpecBookLevel('unit'), false);
  assert.equal(isSpecBookLevel('integration_external'), true);
});

test('resolveSpecBookLevel - unit 指定時は内結以降へフォールバック', () => {
  const catalog = emptyCatalog();
  catalog.chapters.find(c => c.level === 'integration_external')!.cases = [
    { id: 'TC-ITb-0001' } as any,
  ];
  assert.equal(resolveSpecBookLevel(catalog, 'unit'), 'integration_external');
});
