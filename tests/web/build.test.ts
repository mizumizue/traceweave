import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: Webダッシュボード静的ビルド成果物
 * - 条件: 事前に生成された静的ビルド成果物ディレクトリ（src/web/dist）を検査
 * - 期待結果: 既存のindex.htmlおよびdata.jsonが存在し、要件定義・テストケース実測値（execution_status/actual_result）および円形ゲージ用スコアが含まれていること
 * - 関連文書: TC-0006, TC-0009, REQ-0006, REQ-0007, SPEC-0006, SPEC-0007
 */
test('TC-0006 & TC-0009: Webダッシュボードビルド成果物および実測ペイロード外部契約を検証すること', () => {
  const distWeb = fs.existsSync(repositoryPath('src/web/dist'))
    ? repositoryPath('src/web/dist')
    : repositoryPath('dist/web');
  assert.ok(fs.existsSync(distWeb), 'src/web/dist should exist');

  const indexHtml = path.join(distWeb, 'index.html');
  assert.ok(fs.existsSync(indexHtml), 'index.html should exist');

  const dataJson = path.join(distWeb, 'data.json');
  assert.ok(fs.existsSync(dataJson), 'data.json should exist');

  const parsedData = JSON.parse(fs.readFileSync(dataJson, 'utf-8'));
  assert.ok(parsedData.summary.totalRequirements >= 7);
  assert.ok(parsedData.summary.totalTestCases >= 9);
  assert.ok(parsedData.matrix.length >= 7);
  assert.ok(parsedData.nodes && parsedData.nodes.length >= 30, 'Full nodes list should be included');

  // Verify that test cases contain execution_status and actual_result (TC-0008, TC-0009)
  const tcWithActual = parsedData.nodes.find((n: any) => n.kind === 'test_case' && n.actual_result);
  assert.ok(tcWithActual, 'At least one test case should have actual_result');
  assert.equal(tcWithActual.execution_status, 'passed');
  assert.ok(tcWithActual.objective, 'Test case objective should be included');
  assert.ok(tcWithActual.steps, 'Test case steps should be included');
  assert.ok(tcWithActual.expected_result, 'Test case expected result should be included');

  // Verify REQ-0010 (Circular Gauge sufficiency visualization requirement)
  const req0010 = parsedData.matrix.find((r: any) => r.requirementId === 'REQ-0010');
  assert.ok(req0010, 'REQ-0010 should exist in the matrix');
  assert.ok(req0010.score >= 0 && req0010.score <= 100, 'REQ-0010 score should be valid for circular gauge');
});
