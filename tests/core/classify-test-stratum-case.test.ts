import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTestStratumTraceIndexes,
  classifyTestStratumCase,
} from '../../src/core/testing/classifyTestStratumCase.js';
import { DocNode } from '../../src/core/models/types.js';

test('classifyTestStratumCase - verifies REQ から UC と FR/NFR を解決すること', () => {
  const nodes: DocNode[] = [
    {
      id: 'REQ-0001',
      kind: 'requirement',
      title: '機能要件',
      status: 'accepted',
      created: '2026-09-19',
      updated: '2026-09-19',
      scope: 'local',
      requirement_class: 'functional',
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'UC-0001',
      kind: 'use_case',
      title: 'トレース確認',
      status: 'accepted',
      created: '2026-09-19',
      updated: '2026-09-19',
      scope: 'local',
      requirement_refs: ['REQ-0001'],
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
    {
      id: 'TC-ITb-0099',
      kind: 'test_case',
      title: 'sample',
      status: 'accepted',
      created: '2026-09-19',
      updated: '2026-09-19',
      scope: 'local',
      verifies: ['REQ-0001'],
      depends_on: [],
      tags: [],
      links: [],
      content: '',
    },
  ];
  const indexes = buildTestStratumTraceIndexes(nodes);
  const cls = classifyTestStratumCase(['REQ-0001'], indexes);
  assert.equal(cls.requirementClasses[0], 'functional');
  assert.equal(cls.useCases[0].id, 'UC-0001');
});
