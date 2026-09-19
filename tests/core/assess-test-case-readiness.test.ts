import test from 'node:test';
import assert from 'node:assert/strict';
import { assessTestCaseReadiness } from '../../src/core/testing/assessTestCaseReadiness.js';
import { DocNode } from '../../src/core/models/types.js';

function reqSufficiency(id: string, score: number, isFullySatisfied: boolean) {
  return {
    requirementId: id,
    title: id,
    criticality: 'medium' as const,
    score,
    isFullySatisfied,
    phaseCounts: {
      unit: 0,
      integration_internal: 0,
      integration_external: 0,
      system: 0,
      acceptance: 0,
    },
    documentedPhaseCounts: {
      unit: 0,
      integration_internal: 0,
      integration_external: 0,
      system: 0,
      acceptance: 0,
    },
    methodCounts: {},
    associatedSpecs: [],
    testCaseIds: [],
    executedTestCaseIds: [],
    pendingTestCaseIds: [],
    failedTestCaseIds: [],
    missingPhases: isFullySatisfied ? [] : (['integration_external'] as const),
  };
}

test('assessTestCaseReadiness - 参照 REQ が未充足なら要確認になること', () => {
  const node: DocNode = {
    id: 'TC-ITb-0001',
    kind: 'test_case',
    title: 't',
    status: 'accepted',
    created: '2026-09-19',
    updated: '2026-09-19',
    scope: 'local',
    test_level: 'integration_external',
    execution_status: 'passed',
    verifies: ['REQ-0001'],
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };
  const map = new Map([['REQ-0001', reqSufficiency('REQ-0001', 40, false)]]);
  const result = assessTestCaseReadiness(node, map);
  assert.equal(result.readiness, 'attention');
  assert.ok(result.gapHints.some(h => h.includes('REQ-0001')));
});

test('assessTestCaseReadiness - 実行失敗は要対応になること', () => {
  const node: DocNode = {
    id: 'TC-ITb-0002',
    kind: 'test_case',
    title: 't',
    status: 'accepted',
    created: '2026-09-19',
    updated: '2026-09-19',
    scope: 'local',
    test_level: 'integration_external',
    execution_status: 'failed',
    verifies: ['REQ-0001'],
    depends_on: [],
    tags: [],
    links: [],
    content: '',
  };
  const map = new Map([['REQ-0001', reqSufficiency('REQ-0001', 100, true)]]);
  const result = assessTestCaseReadiness(node, map);
  assert.equal(result.readiness, 'blocked');
});
