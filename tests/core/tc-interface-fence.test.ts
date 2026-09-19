import assert from 'node:assert/strict';
import test from 'node:test';
import { findTestCaseInterfaceFenceLeaks } from '../../src/infrastructure/governance/tcInterfaceFence.js';

test('findTestCaseInterfaceFenceLeaks - ITa rejects implementation backticks in Steps', () => {
  const leaks = findTestCaseInterfaceFenceLeaks(
    '1. `SufficiencyScorer.calculateAll` を実行する。',
    'integration_internal'
  );
  assert.ok(leaks.some((l) => l.includes('dotted implementation call')));
  assert.ok(leaks.some((l) => l.includes('SufficiencyScorer')));
});

test('findTestCaseInterfaceFenceLeaks - ITb allows MCP tool backticks', () => {
  const leaks = findTestCaseInterfaceFenceLeaks(
    '1. `get_traceability_summary` を呼び出す。',
    'integration_external'
  );
  assert.equal(leaks.length, 0);
});

test('findTestCaseInterfaceFenceLeaks - UT skips fence', () => {
  const leaks = findTestCaseInterfaceFenceLeaks('`TraceGraph`', 'unit');
  assert.equal(leaks.length, 0);
});
