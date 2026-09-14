import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { repositoryPath } from '../helpers/repo-path.js';
import { buildActorUseCaseMap } from '../../src/web/src/utils/actorUseCaseMap.js';

/**
 * 【テスト概要】
 * - 対象: buildActorUseCaseMap (決め事カタログ Actor ↔ UseCase 参加関係マップ)
 * - 条件: 実リポジトリ docs/ から構築したカタログを入力
 * - 期待結果: アクター起点・UC起点の双方向行が構築され、ACT-0001 と UC-0001 のリンクが一致すること
 * - 関連文書: REQ-0018, NEED-0006
 */
test('buildActorUseCaseMap - カタログから Actor と UseCase の双方向参加関係マップを構築すること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const map = buildActorUseCaseMap(report.catalog);

  assert.ok(map.byActor.length > 0, 'actors must exist');
  assert.ok(map.byUseCase.length > 0, 'use cases must exist');
  assert.equal(map.kindFilterBlocksView, false);

  const act0001 = map.byActor.find(row => row.actor.id === 'ACT-0001');
  assert.ok(act0001, 'ACT-0001 row must exist');
  assert.ok(
    act0001.useCases.some(uc => uc.id === 'UC-0001'),
    'ACT-0001 must link to UC-0001'
  );

  const uc0001 = map.byUseCase.find(row => row.useCase.id === 'UC-0001');
  assert.ok(uc0001, 'UC-0001 row must exist');
  assert.ok(
    uc0001.actors.some(act => act.id === 'ACT-0001'),
    'UC-0001 must link to ACT-0001'
  );

  assert.ok(map.linkCount >= act0001.useCases.length);
});

/**
 * 【テスト概要】
 * - 対象: buildActorUseCaseMap (種別フィルター非互換判定)
 * - 条件: 種別フィルターを requirement に設定
 * - 期待結果: kindFilterBlocksView が true となり、Actor-UC マップ表示を抑止できること
 * - 関連文書: REQ-0017, REQ-0018
 */
test('buildActorUseCaseMap - 要件種別フィルター時は Actor-UC マップ表示をブロックすること', () => {
  const { report } = buildTraceWeaveReport({ docsDir: repositoryPath('docs'), useCache: false });
  const map = buildActorUseCaseMap(report.catalog, { kind: 'requirement' });

  assert.equal(map.kindFilterBlocksView, true);
  assert.equal(map.byActor.length, 0);
  assert.equal(map.byUseCase.length, 0);
});
