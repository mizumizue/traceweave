import {
  RequirementSufficiency,
  TestCaseReadiness,
  TestLevel,
  TestStratumCaseEntry,
  TestStratumLinkedRequirement,
} from '../models/types.js';
import { DocNode } from '../models/types.js';

export function assessTestCaseReadiness(
  node: DocNode,
  requirementById: Map<string, RequirementSufficiency>
): Pick<TestStratumCaseEntry, 'readiness' | 'gapHints' | 'linkedRequirements'> {
  const verifies = node.verifies ?? [];
  const status = node.execution_status ?? 'pending';
  const level = node.test_level;
  const gapHints: string[] = [];
  const linkedRequirements: TestStratumLinkedRequirement[] = [];

  for (const targetId of verifies) {
    if (!targetId.startsWith('REQ-')) continue;
    const req = requirementById.get(targetId);
    if (!req) {
      linkedRequirements.push({
        id: targetId,
        score: 0,
        isFullySatisfied: false,
        missing: true,
      });
      gapHints.push(`${targetId} がグラフに存在しません`);
      continue;
    }
    linkedRequirements.push({
      id: targetId,
      score: req.score,
      isFullySatisfied: req.isFullySatisfied,
      missing: false,
    });
    if (!req.isFullySatisfied) {
      const phases = req.missingPhases?.length
        ? `欠落工程: ${req.missingPhases.join(', ')}`
        : `充足度 ${req.score}%`;
      gapHints.push(`${targetId} 未充足（${phases}）`);
    }
  }

  if (status === 'failed') {
    gapHints.unshift('直近の実行が失敗');
    return { readiness: 'blocked', gapHints, linkedRequirements };
  }

  if (status === 'skipped') {
    gapHints.unshift('実行がスキップ');
    return { readiness: 'attention', gapHints, linkedRequirements };
  }

  if (status === 'pending') {
    gapHints.unshift('自動テスト未実行（pending）');
  }

  const isTraceabilityLevel =
    level === 'integration_internal' ||
    level === 'integration_external' ||
    level === 'system' ||
    level === 'acceptance';

  if (isTraceabilityLevel && verifies.length === 0) {
    gapHints.push('verifies（REQ/SPEC）が未設定');
    return { readiness: 'blocked', gapHints, linkedRequirements };
  }

  if (level === 'unit' && verifies.length === 0) {
    if (gapHints.length === 0 && status === 'passed') {
      gapHints.push('単体は実装カバレッジ軸（REQ 直結なし）');
      return { readiness: 'adequate', gapHints, linkedRequirements };
    }
  }

  const unsatisfiedLinked = linkedRequirements.filter(r => !r.missing && !r.isFullySatisfied);
  const missingLinked = linkedRequirements.filter(r => r.missing);

  if (missingLinked.length > 0 || unsatisfiedLinked.length > 0) {
    if (status === 'passed') {
      return { readiness: 'attention', gapHints, linkedRequirements };
    }
    return { readiness: 'attention', gapHints, linkedRequirements };
  }

  if (status === 'passed' && verifies.length > 0) {
    gapHints.push('参照要件はトレーサビリティ上充足');
    return { readiness: 'strong', gapHints, linkedRequirements };
  }

  if (status === 'passed') {
    return { readiness: 'adequate', gapHints, linkedRequirements };
  }

  return { readiness: 'attention', gapHints, linkedRequirements };
}

export function isLikelySufficient(readiness: TestCaseReadiness): boolean {
  return readiness === 'strong' || readiness === 'adequate';
}

export function needsAttention(readiness: TestCaseReadiness): boolean {
  return readiness === 'attention' || readiness === 'blocked';
}
