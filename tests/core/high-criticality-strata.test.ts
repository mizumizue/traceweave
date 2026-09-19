import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { TraceGraph } from '../../src/core/graph/TraceGraph.js';
import { TraceabilityGraphBuilder } from '../../src/core/graph/TraceabilityGraphBuilder.js';
import { DecisionsCatalogBuilder } from '../../src/core/decisions/DecisionsCatalogBuilder.js';
import { TestRunnerRegistry } from '../../src/core/testing/TestRunnerRegistry.js';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { calculatePyramidLayerMetrics } from '../../src/web/src/components/VisualTestPyramid.js';
import { parseUrlState, serializeUrlState } from '../../src/web/src/utils/urlState.js';
import { partitionByRequirementClass } from '../../src/core/models/requirementClass.js';
import { DocNode } from '../../src/core/models/types.js';
import { repositoryPath } from '../helpers/repo-path.js';

function synthNode(partial: Partial<DocNode> & Pick<DocNode, 'id' | 'kind' | 'title'>): DocNode {
  return {
    status: 'accepted',
    created: '2026-09-14',
    updated: '2026-09-14',
    scope: 'local',
    depends_on: [],
    tags: [],
    links: [],
    content: '',
    ...partial,
  };
}

/**
 * 【テスト概要】
 * - 対象: DocParser と TraceGraph の内部結合
 * - 条件: 実 docs/ をパースしてグラフに登録し REQ-0001 の依存連鎖を探索
 * - 期待結果: NEED-0001 から SPEC までの上流・下流が解決されること
 * - 関連文書: TC-ITa-0004, REQ-0001, SPEC-0002
 */
test('TC-ITa-0004: TraceGraph - 実ドキュメントパース結果の内部結合グラフ探索が REQ-0001 連鎖を解決すること', () => {
  const parser = new DocParser();
  const nodes = parser.parseDirectory(repositoryPath('docs'));
  const graph = new TraceGraph();
  for (const node of nodes) graph.addNode(node);

  const req = graph.getNode('REQ-0001');
  assert.ok(req);
  const upstream = graph.getUpstream('REQ-0001');
  assert.ok(upstream.some(n => n.id === 'NEED-0001'));
  const specs = graph.getSpecsForRequirement('REQ-0001');
  assert.ok(specs.length >= 2);
  const tcs = graph.getAllTestCasesForRequirement('REQ-0001');
  assert.ok(tcs.length >= 3);
});

/**
 * 【テスト概要】
 * - 対象: DocParser セクション抽出（文書詳細表示の前提）
 * - 条件: REQ-0006 関連のテストケース文書をパース
 * - 期待結果: Objective / Steps / Expected Results セクションが空でないこと
 * - 関連文書: TC-UT-0011, REQ-0006, SPEC-0006
 */
test('TC-UT-0011: DocParser - テストケース文書の詳細セクションが単体で正しく抽出されること', () => {
  const parser = new DocParser();
  const node = parser.parseFile(repositoryPath('docs/test-cases/TC-UT-0001.md'));
  assert.ok(node);
  assert.ok(node.sections.Objective?.length);
  assert.ok(node.sections.Steps?.length);
  assert.ok(node.sections['Expected Results']?.length);
});

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport のノード詳細ペイロード
 * - 条件: 実 docs/ と test-results を用いてレポート生成
 * - 期待結果: 要件・テストケースにセクションと実行結果が含まれること
 * - 関連文書: TC-ITa-0005-01, REQ-0006, SPEC-0006
 */
test('TC-ITa-0005-01: buildTraceWeaveReport - 文書詳細セクションがノードに内部結合されること', () => {
  const { report } = buildTraceWeaveReport({
    docsDir: repositoryPath('docs'),
    useCache: false,
  });
  const req = report.nodes.find(n => n.id === 'REQ-0007');
  assert.ok(req?.sections?.Statement);
  const tc = report.nodes.find(n => n.id === 'TC-UT-0001');
  assert.ok(tc?.sections?.Objective);
});

/**
 * 【テスト概要】
 * - 対象: buildTraceWeaveReport と test-results マージ
 * - 条件: 集約実行レポートが存在し TC-UT-0001 が passed のとき
 * - 期待結果: ノード execution_status が passed となること
 * - 関連文書: TC-ITa-0005-02, REQ-0007, SPEC-0007
 */
test('TC-ITa-0005-02: buildTraceWeaveReport - テスト実行レポートと execution_status が結合されること', () => {
  const reportPath = repositoryPath('reports/test-results.json');
  if (!fs.existsSync(reportPath)) return;
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
    results?: Record<string, { status?: string }>;
  };
  if (raw.results?.['TC-UT-0001']?.status !== 'passed') return;
  const { report } = buildTraceWeaveReport({
    docsDir: repositoryPath('docs'),
    useCache: false,
    testReportPath: reportPath,
  });
  const tc = report.nodes.find(n => n.id === 'TC-UT-0001');
  assert.equal(tc?.execution_status, 'passed');
});

/**
 * 【テスト概要】
 * - 対象: TestRunnerRegistry の純粋計算ハンドラ登録
 * - 条件: 充足度計算ハンドラ（TC-UT-0002 系）を実行
 * - 期待結果: 入力に応じた score が決定論的に返ること
 * - 関連文書: TC-UT-0012, REQ-0008, REQ-0009, SPEC-0008
 */
test('TC-UT-0012: TestRunnerRegistry - データ駆動テストハンドラが単体で決定論的に score を返すこと', () => {
  const result = TestRunnerRegistry.runTest({
    testCaseId: 'TC-UT-0002',
    inputs: {
      criticality: 'high',
      phaseCounts: { unit: 1, integration_internal: 1, integration_external: 1, system: 0, acceptance: 0 },
    },
    expected: { score: 70, isFullySatisfied: false },
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.actual.score, 70);
});

/**
 * 【テスト概要】
 * - 対象: レポート地層データと VisualTestPyramid メトリクス
 * - 条件: 実レポートの strata をピラミッド計算に投入
 * - 期待結果: 5 層の比率が 100% に整合すること
 * - 関連文書: TC-ITa-0006, REQ-0014, SPEC-0014
 */
test('TC-ITa-0006: VisualTestPyramid - 実レポート地層から内部結合でピラミッド比率が算出されること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const metrics = calculatePyramidLayerMetrics(report.strata);
  assert.equal(metrics.length, 5);
  const total = metrics.reduce((sum, m) => sum + m.ratioPercent, 0);
  assert.ok(total >= 99 && total <= 101);
});

/**
 * 【テスト概要】
 * - 対象: DecisionsCatalogBuilder の相互参照解決
 * - 条件: 合成 ACT/UC/ADR/DSN ノード群
 * - 期待結果: ACT の relatedUseCases と ADR の relatedDesigns が解決されること
 * - 関連文書: TC-UT-0013, REQ-0017, REQ-0018, SPEC-0017
 */
test('TC-UT-0013: DecisionsCatalogBuilder - 合成ノードの相互参照が単体で双方向解決されること', () => {
  const nodes: DocNode[] = [
    synthNode({ id: 'ACT-0001', kind: 'actor', title: 'Actor' }),
    synthNode({
      id: 'UC-0001',
      kind: 'use_case',
      title: 'UC',
      actor_refs: ['ACT-0001'],
      requirement_refs: ['REQ-0001'],
    }),
    synthNode({ id: 'ADR-0001', kind: 'decision', title: 'ADR', links: ['DSN-0001'] }),
    synthNode({ id: 'DSN-0001', kind: 'design', title: 'DSN', depends_on: ['SPEC-0001'] }),
    synthNode({ id: 'SPEC-0001', kind: 'specification', title: 'Spec', depends_on: ['REQ-0001'] }),
    synthNode({ id: 'REQ-0001', kind: 'requirement', title: 'Req', depends_on: ['NEED-0001'] }),
    synthNode({ id: 'NEED-0001', kind: 'need', title: 'Need' }),
  ];
  const catalog = DecisionsCatalogBuilder.build(nodes);
  const act = catalog.items.find(i => i.id === 'ACT-0001');
  assert.ok(act?.relatedUseCases?.some(uc => uc.id === 'UC-0001'));
  const adr = catalog.items.find(i => i.id === 'ADR-0001');
  assert.ok(adr?.relatedDesigns?.some(d => d.id === 'DSN-0001'));
});

/**
 * 【テスト概要】
 * - 対象: 実ドキュメントに対する DecisionsCatalog 集計
 * - 条件: docs/ 全ノードをカタログ化
 * - 期待結果: kindCounts・requirementClassCounts・totalCount が正であること
 * - 関連文書: TC-ITa-0007, REQ-0017, REQ-0018, REQ-0019, SPEC-0017
 */
test('TC-ITa-0007: DecisionsCatalogBuilder - 実ドキュメントのカタログ統計が内部結合で整合すること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  assert.ok(report.catalog);
  assert.equal(report.catalog!.totalCount, report.nodes.length);
  assert.ok(report.catalog!.kindCounts.requirement >= 20);
  assert.ok(
    report.catalog!.requirementClassCounts.functional +
      report.catalog!.requirementClassCounts.non_functional +
      report.catalog!.requirementClassCounts.unclassified >=
      report.catalog!.kindCounts.requirement
  );
});

/**
 * 【テスト概要】
 * - 対象: TraceabilityGraphBuilder のハイライト計算
 * - 条件: 最小 NEED-REQ-SPEC 連鎖と選択ノード
 * - 期待結果: isHighlighted / isDimmed が決定論的に付与されること
 * - 関連文書: TC-UT-0014, REQ-0020, REQ-0021, SPEC-0018
 */
test('TC-UT-0014: TraceabilityGraphBuilder - 選択ノードのハイライトが単体で決定論的に算出されること', () => {
  const nodes: DocNode[] = [
    synthNode({ id: 'NEED-0007', kind: 'need', title: 'Need' }),
    synthNode({ id: 'REQ-0020', kind: 'requirement', title: 'Graph', depends_on: ['NEED-0007'], criticality: 'high' }),
    synthNode({ id: 'SPEC-0018', kind: 'specification', title: 'Spec', depends_on: ['REQ-0020'] }),
    synthNode({ id: 'NEED-9999', kind: 'need', title: 'Isolated' }),
  ];
  const data = TraceabilityGraphBuilder.buildGraph(nodes, { selectedNodeId: 'REQ-0020', highlightMode: 'all' });
  const selected = data.nodes.find(n => n.id === 'REQ-0020');
  assert.ok(selected?.isHighlighted);
  const isolated = data.nodes.find(n => n.id === 'NEED-9999');
  assert.ok(isolated?.isDimmed);
});

/**
 * 【テスト概要】
 * - 対象: 実ドキュメントの TraceabilityGraphBuilder
 * - 条件: docs/ 全ノードでグラフ構築と種別除外
 * - 期待結果: ランク付け・パスハイライト・excludedKinds が動作すること
 * - 関連文書: TC-ITa-0008, REQ-0020, REQ-0021, REQ-0022, SPEC-0018
 */
test('TC-ITa-0008: TraceabilityGraphBuilder - 実ドキュメントのレイアウトと種別除外が内部結合で動作すること', () => {
  const parser = new DocParser();
  const nodes = parser.parseDirectory(repositoryPath('docs'));
  const graph = new TraceGraph();
  for (const n of nodes) graph.addNode(n);
  const full = TraceabilityGraphBuilder.buildGraph(nodes, { traceGraph: graph, selectedNodeId: 'REQ-0020' });
  const filtered = TraceabilityGraphBuilder.buildGraph(nodes, {
    traceGraph: graph,
    excludedKinds: new Set(['test_case']),
  });
  assert.ok(full.nodes.length > filtered.nodes.length);
  assert.ok(full.nodes.some(n => n.id === 'REQ-0020' && n.isHighlighted));
});

/**
 * 【テスト概要】
 * - 対象: urlState パース・シリアライズ
 * - 条件: reqclass 等のクエリパラメータ
 * - 期待結果: 往復後に同一状態になること
 * - 関連文書: TC-UT-0015, REQ-0023, REQ-0024, SPEC-0019
 */
test('TC-UT-0015: urlState - 区分・タブ・ノードのクエリが単体で往復シリアライズされること', () => {
  const state = parseUrlState('?tab=graph&node=REQ-0024&reqclass=functional&highlight=upstream');
  assert.equal(state.tab, 'traceability');
  assert.equal(state.traceabilityView, 'graph');
  assert.equal(state.nodeId, 'REQ-0024');
  assert.equal(state.requirementClassFilter, 'functional');
  const roundTrip = parseUrlState(serializeUrlState(state));
  assert.equal(roundTrip.tab, state.tab);
  assert.equal(roundTrip.nodeId, state.nodeId);
  assert.equal(roundTrip.requirementClassFilter, state.requirementClassFilter);
});

/**
 * 【テスト概要】
 * - 対象: レポートノード ID と URL 状態の整合
 * - 条件: 実レポートから node クエリを生成・復元
 * - 期待結果: 存在する要件 ID が URL から復元されること
 * - 関連文書: TC-ITa-0009, REQ-0023, REQ-0024, SPEC-0019
 */
test('TC-ITa-0009: urlState - 実レポート要件 ID が URL 状態と内部結合で整合すること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const req = report.nodes.find(n => n.id === 'REQ-0024');
  assert.ok(req);
  const query = serializeUrlState({
    tab: 'traceability',
    traceabilityView: 'matrix',
    nodeId: 'REQ-0024',
    searchQuery: '',
    phaseFilter: 'all',
    criticalityFilter: 'all',
    requirementClassFilter: 'all',
    scoreFilter: 'all',
    catalogKind: 'all',
    catalogTag: null,
    catalogStatus: 'all',
    graphHighlight: 'all',
  });
  const parsed = parseUrlState(query);
  assert.equal(parsed.nodeId, 'REQ-0024');
});

/**
 * 【テスト概要】
 * - 対象: CLI catalog コマンドの要件区分集計
 * - 条件: 実 docs/ で catalog を JSON 出力
 * - 期待結果: requirementClassCounts が機能・非機能を含むこと
 * - 関連文書: TC-ITb-0027, REQ-0026, REQ-0027, SPEC-0021
 */
test('TC-ITb-0027: CLI catalog - 要件区分統計が外部結合で JSON に含まれること', () => {
  const output = execFileSync(
    process.execPath,
    [
      repositoryPath('src/node_modules/tsx/dist/cli.mjs'),
      repositoryPath('src/cli/index.ts'),
      'catalog',
      '--docs',
      repositoryPath('docs'),
      '--format',
      'json',
    ],
    { cwd: repositoryPath(), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  const catalog = JSON.parse(output);
  assert.ok(catalog.requirementClassCounts.functional >= 20);
  assert.ok(catalog.requirementClassCounts.non_functional >= 2);
});

/**
 * 【テスト概要】
 * - 対象: カタログの FR/NFR グループ分割
 * - 条件: 実レポートノードを partitionByRequirementClass に投入
 * - 期待結果: 機能要件群と非機能要件群が分離されること
 * - 関連文書: TC-ITa-0010, REQ-0028, SPEC-0022
 */
test('TC-ITa-0010: requirementClass - カタログ要件が FR/NFR 群に内部結合で分割されること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const reqs = report.nodes.filter(n => n.kind === 'requirement');
  const groups = partitionByRequirementClass(reqs);
  assert.ok(groups.functional.length >= 20);
  assert.ok(groups.non_functional.length >= 2);
  assert.ok(groups.functional.every(r => r.requirement_class === 'functional'));
  assert.ok(groups.non_functional.every(r => r.requirement_class === 'non_functional'));
});

/**
 * 【テスト概要】
 * - 対象: Web ダッシュボード data.json の区分メタデータ
 * - 条件: ビルド済み dist/data.json を検査
 * - 期待結果: 要件ノードに requirement_class が含まれカタログ統計があること
 * - 関連文書: TC-ITb-0028, REQ-0028, SPEC-0022
 */
test('TC-ITb-0028: Web data.json - 要件区分メタデータが外部結合ペイロードに含まれること', () => {
  const dataJson = repositoryPath('src/web/dist/data.json');
  assert.ok(fs.existsSync(dataJson), 'src/web/dist/data.json must exist');
  const data = JSON.parse(fs.readFileSync(dataJson, 'utf-8'));
  const nfr = data.nodes.find((n: DocNode) => n.id === 'REQ-0028');
  assert.equal(nfr?.requirement_class, 'non_functional');
  assert.ok(data.catalog?.requirementClassCounts?.functional >= 20);
  assert.ok(data.summary.functionalRequirementCount >= 20);
});
