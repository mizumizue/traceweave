import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { SufficiencyScorer } from '../../src/core/sufficiency/SufficiencyScorer.js';
import { UseCaseSufficiencyScorer } from '../../src/core/sufficiency/UseCaseSufficiencyScorer.js';
import { DocNode, TestLevel } from '../../src/core/models/types.js';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';

function baseDoc(id: string, kind: DocNode['kind'], extra: Partial<DocNode> = {}): DocNode {
  return {
    id,
    kind,
    title: id,
    status: 'accepted',
    created: '2026-09-19',
    updated: '2026-09-19',
    scope: 'local',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
    ...extra,
  };
}

function traceabilityTc(id: string, level: TestLevel, verifies: string[]): DocNode {
  return baseDoc(id, 'test_case', {
    test_level: level,
    test_method: 'api_contract',
    verifies,
    execution_status: 'passed',
  });
}

/**
 * 【テスト概要】
 * - 対象: UseCaseSufficiencyScorer（ユースケース充足度の派生集計）
 * - 条件: requirement_refs が空の UC、および 2 要件の平均スコアを持つ UC をグラフに投入
 * - 期待結果: 未割当 UC は status unassigned、割当 UC は参照要件スコアの平均が score になること
 * - 関連文書: TC-ITa-0012-01, REQ-0032
 */
test('TC-ITa-0012-01: UseCaseSufficiencyScorer - requirement_refs のロールアップと未割当判定が正しいこと', () => {
  const graph = new TraceGraph();
  graph.addNode(baseDoc('REQ-A', 'requirement', { criticality: 'high' }));
  graph.addNode(baseDoc('REQ-B', 'requirement', { criticality: 'medium' }));
  graph.addNode(
    traceabilityTc('TC-A', 'integration_external', ['REQ-A'])
  );
  graph.addNode(
    traceabilityTc('TC-B', 'integration_internal', ['REQ-B'])
  );
  graph.addNode(
    baseDoc('UC-EMPTY', 'use_case', {
      actor_refs: ['ACT-1'],
      requirement_refs: [],
    })
  );
  graph.addNode(
    baseDoc('UC-OK', 'use_case', {
      actor_refs: ['ACT-1'],
      requirement_refs: ['REQ-A', 'REQ-B'],
    })
  );

  const reqSufficiencies = new SufficiencyScorer().calculateAll(graph);
  const useCases = new UseCaseSufficiencyScorer().calculateAll(graph, reqSufficiencies);

  const empty = useCases.find(uc => uc.useCaseId === 'UC-EMPTY');
  assert.ok(empty);
  assert.equal(empty.status, 'unassigned');
  assert.equal(empty.score, undefined);

  const ok = useCases.find(uc => uc.useCaseId === 'UC-OK');
  assert.ok(ok);
  assert.equal(ok.status, 'scored');
  assert.equal(typeof ok.score, 'number');
  assert.ok((ok.score ?? 0) > 0);
  assert.equal(ok.requirementRefCount, 2);
});

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport の useCases ペイロード
 * - 条件: リポジトリ実 docs を解析
 * - 期待結果: useCases 配列と summary の useCaseCount が 1 件以上であること
 * - 関連文書: TC-ITa-0012-02, SPEC-0027
 */
test('TC-ITa-0012-02: buildTraceWeaveReport - ユースケース充足度がレポート JSON に含まれること', () => {
  const { report } = buildTraceWeaveReport({
    docsDir: repositoryPath('docs'),
    useCache: false,
  });
  assert.ok(Array.isArray(report.useCases));
  assert.ok(report.useCases.length > 0);
  assert.ok(report.summary.useCaseCount > 0);
  assert.ok(report.summary.useCaseAssignedCount > 0);
  assert.ok(typeof report.summary.averageUseCaseSufficiencyScore === 'number');
  const scored = report.useCases.filter(uc => uc.status === 'scored');
  assert.ok(scored.length > 0);
  for (const uc of scored) {
    assert.ok(uc.score !== undefined);
    assert.ok(uc.score >= 0 && uc.score <= 100);
  }
});
