import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countRequirementClasses,
  getRequirementClassMeta,
  isRequirementClass,
  resolveRequirementClass,
  REQUIREMENT_CLASS_META,
} from '../../src/core/models/requirementClass.js';
import { validateDocs } from '../../scripts/validate-docs.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: requirementClass 判定・ラベル契約、および要件文書の必須検証
 * - 条件: 許容値・不正値・欠落、ならびに実リポジトリの docs/ を検証
 * - 期待結果: FR/NFR ラベルが固定され、不正値は未分類のまま残り、実文書は区分必須を満たす
 * - 関連文書: TC-0034, REQ-0026, REQ-0028, SPEC-0021
 */
test('TC-0034: requirementClass - 許容値判定と FR/NFR ラベル契約が決定論的であること', () => {
  assert.equal(isRequirementClass('functional'), true);
  assert.equal(isRequirementClass('non_functional'), true);
  assert.equal(isRequirementClass('quality'), false);
  assert.equal(isRequirementClass(undefined), false);
  assert.equal(resolveRequirementClass('quality'), undefined);
  assert.equal(resolveRequirementClass('functional'), 'functional');

  assert.equal(REQUIREMENT_CLASS_META.functional.short, 'FR');
  assert.equal(REQUIREMENT_CLASS_META.functional.label, '機能要件');
  assert.equal(REQUIREMENT_CLASS_META.non_functional.short, 'NFR');
  assert.equal(REQUIREMENT_CLASS_META.non_functional.label, '非機能要件');
  assert.equal(getRequirementClassMeta('high'), undefined);

  const counts = countRequirementClasses([
    { kind: 'requirement', requirement_class: 'functional' },
    { kind: 'requirement', requirement_class: 'functional' },
    { kind: 'requirement', requirement_class: 'non_functional' },
    { kind: 'requirement' },
    { kind: 'specification', requirement_class: 'functional' },
  ]);
  assert.deepEqual(counts, { functional: 2, non_functional: 1, unclassified: 1 });
  assert.deepEqual(countRequirementClasses([
    { kind: 'requirement', requirement_class: 'functional' },
    { kind: 'requirement', requirement_class: 'functional' },
    { kind: 'requirement', requirement_class: 'non_functional' },
    { kind: 'requirement' },
    { kind: 'specification', requirement_class: 'functional' },
  ]), counts);
});

/**
 * 【テスト概要】
 * - 対象: validate-docs（要件区分の必須検証）
 * - 条件: リポジトリ実ドキュメントを検証する
 * - 期待結果: 全要件が functional または non_functional を持ち、検証が成功する
 * - 関連文書: TC-0034, REQ-0026, SPEC-0021
 */
test('TC-0034: validate-docs - 実リポジトリの要件が requirement_class 必須検証を通過すること', () => {
  const result = validateDocs(repositoryPath('docs'));
  assert.equal(result.passed, true, result.errors.join('\n'));
  const reqs = result.docs.filter(doc => doc.meta.kind === 'requirement');
  assert.ok(reqs.length >= 3);
  for (const req of reqs) {
    assert.ok(
      req.meta.requirement_class === 'functional' || req.meta.requirement_class === 'non_functional',
      `${req.meta.id} must declare requirement_class`
    );
  }
  const nfr = reqs.find(doc => doc.meta.id === 'REQ-0028');
  assert.equal(nfr?.meta.requirement_class, 'non_functional');
});
