import test from 'node:test';
import assert from 'node:assert/strict';
import { formalTestCaseIdFromTitle } from '../../src/core/testing/testCaseId.js';
import { parseTapReportToResults } from '../../src/core/testing/parseTapTestReport.js';
import { playwrightReportToTraceWeaveV1 } from '../../src/core/testing/playwrightReportToTraceWeaveV1.js';

test('formalTestCaseIdFromTitle — 行頭 TC 宣言行のみを形式証跡キーとして採用すること', () => {
  assert.equal(formalTestCaseIdFromTitle('TC-UT-0001: 正常系'), 'TC-UT-0001');
  assert.equal(formalTestCaseIdFromTitle('TC-ITb-0001-03: 分割'), 'TC-ITb-0001-03');
  assert.equal(formalTestCaseIdFromTitle('support: TC-UT-0001 参照'), null);
  assert.equal(formalTestCaseIdFromTitle('prefix TC-UT-0002: 途中'), null);
});

test('parseTapReportToResults — タイトル行頭 TC のみ results に載せること', () => {
  const tap = `
# Subtest: formal
ok 1 - TC-UT-0002: passes
  duration_ms: 1.2
# Subtest: support
ok 2 - support: mentions TC-UT-0003 in body
  duration_ms: 0.5
`;
  const { results } = parseTapReportToResults(tap, '2026-01-01T00:00:00.000Z');
  assert.ok(results['TC-UT-0002']);
  assert.equal(results['TC-UT-0003'], undefined);
});

test('playwrightReportToTraceWeaveV1 — spec タイトル行頭 TC を traceweave-v1 に変換すること', () => {
  const report = playwrightReportToTraceWeaveV1(
    {
      suites: [
        {
          specs: [
            {
              title: 'TC-ST-0003: ブラウザスモーク',
              tests: [{ results: [{ status: 'passed', duration: 100 }] }],
            },
          ],
        },
      ],
    },
    '2026-01-01T00:00:00.000Z'
  );
  assert.equal(report.results['TC-ST-0003']?.status, 'passed');
  assert.equal(Object.keys(report.results).length, 1);
});
