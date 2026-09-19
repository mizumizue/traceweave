import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTestCaseId,
  extractTestCaseIds,
  testCaseIdMatchesTestLevel,
} from '../../src/core/testing/testCaseId.js';

test('TC-UT-0001: assertTestCaseId accepts stratum ids', () => {
  assertTestCaseId('TC-UT-0001');
  assertTestCaseId('TC-ITa-0042');
  assertTestCaseId('TC-ITb-0001-01');
  assert.throws(() => assertTestCaseId('TC-0001'), /Invalid test case id/);
  assert.throws(() => assertTestCaseId('TC-UT-1'), /Invalid test case id/);
  assert.throws(() => assertTestCaseId('TC-ITb-0001-1'), /Invalid test case id/);
  assert.throws(() => assertTestCaseId('TC-ITb-0001-00'), /Invalid test case id/);
});

test('TC-UT-0001: extractTestCaseIds from titles', () => {
  const ids = extractTestCaseIds("test('TC-ITb-0031: smoke') and TC-UT-0002");
  assert.deepEqual(ids, ['TC-ITb-0031', 'TC-UT-0002']);
  assert.deepEqual(extractTestCaseIds("test('TC-ITb-0001-02: split')"), ['TC-ITb-0001-02']);
});

test('TC-UT-0001: testCaseIdMatchesTestLevel', () => {
  assert.equal(testCaseIdMatchesTestLevel('TC-UT-0001', 'unit'), true);
  assert.equal(testCaseIdMatchesTestLevel('TC-ITb-0001-01', 'integration_external'), true);
  assert.equal(testCaseIdMatchesTestLevel('TC-ITb-0001', 'unit'), false);
});
