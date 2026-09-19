import test from 'node:test';
import assert from 'node:assert/strict';
import { newmanReportToTraceWeaveV1 } from '../../src/core/testing/newmanReportToTraceWeaveV1.js';

test('TC-0063: newmanReportToTraceWeaveV1 aggregates executions by TC ID', () => {
  const report = newmanReportToTraceWeaveV1(
    {
      run: {
        executions: [
          {
            item: { name: 'TC-0063: GET /api/data' },
            assertions: [{ error: null }],
            response: { code: 200 },
            timings: { response: 10 },
          },
          {
            item: { name: 'TC-0063: POST unknown' },
            assertions: [{ error: null }],
            response: { code: 404 },
            timings: { response: 5 },
          },
        ],
      },
    },
    '2026-09-19T00:00:00.000Z'
  );

  assert.equal(report.totalTests, 1);
  assert.equal(report.passedCount, 1);
  assert.equal(report.results['TC-0063']?.status, 'passed');
  assert.equal(report.results['TC-0063']?.durationMs, 15);
});

test('TC-0063: newmanReportToTraceWeaveV1 marks TC failed when any assertion fails', () => {
  const report = newmanReportToTraceWeaveV1({
    run: {
      executions: [
        {
          item: { name: 'TC-0063: bad' },
          assertions: [{ error: { message: 'expected 404' } }],
          response: { code: 500 },
        },
      ],
    },
  });

  assert.equal(report.failedCount, 1);
  assert.equal(report.results['TC-0063']?.status, 'failed');
  assert.match(report.results['TC-0063']?.errorMessage ?? '', /expected 404/);
});
