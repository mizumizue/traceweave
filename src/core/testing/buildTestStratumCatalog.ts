import {
  DocNode,
  RequirementSufficiency,
  TestExecutionStatus,
  TestLevel,
  TestStratumCatalog,
  TestStratumCaseEntry,
  TestStratumChapter,
} from '../models/types.js';
import {
  assessTestCaseReadiness,
  isLikelySufficient,
  needsAttention,
} from './assessTestCaseReadiness.js';
import {
  buildTestStratumTraceIndexes,
  classifyTestStratumCase,
} from './classifyTestStratumCase.js';
import {
  TEST_LEVEL_LABELS,
  TEST_LEVEL_SHORT_LABELS,
  TEST_STRATUM_ORDER,
} from './testLevelLabels.js';

function sectionText(node: DocNode, key: string): string | undefined {
  const fromSections = node.sections?.[key]?.trim();
  if (fromSections) return fromSections;
  return undefined;
}

function testDataText(node: DocNode): string | undefined {
  const fromSection =
    sectionText(node, 'Test Data') ??
    sectionText(node, 'Parameters') ??
    sectionText(node, 'テストデータ');
  if (fromSection) return fromSection;
  if (node.parameter_file) {
    return `外部データセット: ${node.parameter_file}`;
  }
  const patternCount = node.parameters?.patterns?.length;
  if (patternCount && patternCount > 0) {
    return `パラメータセット ${patternCount} 件（対話実行用）`;
  }
  return undefined;
}

function toCaseEntry(
  node: DocNode,
  requirementById: Map<string, RequirementSufficiency>,
  traceIndexes: ReturnType<typeof buildTestStratumTraceIndexes>
): TestStratumCaseEntry {
  const status: TestExecutionStatus = node.execution_status ?? 'pending';
  const assessment = assessTestCaseReadiness(node, requirementById);
  const verifies = node.verifies ?? [];
  return {
    id: node.id,
    title: node.title,
    testMethod: node.test_method,
    verifies,
    parameterFile: node.parameter_file,
    parameters: node.parameters,
    sections: {
      objective: sectionText(node, 'Objective') ?? node.objective,
      preconditions: sectionText(node, 'Preconditions'),
      steps: sectionText(node, 'Steps') ?? node.steps,
      testData: testDataText(node),
      expectedResults: sectionText(node, 'Expected Results') ?? node.expected_result,
    },
    classification: classifyTestStratumCase(verifies, traceIndexes),
    execution: {
      status,
      durationMs: node.execution_duration_ms,
      errorMessage: status === 'failed' ? node.actual_result : undefined,
      actualResult: node.actual_result,
    },
    readiness: assessment.readiness,
    gapHints: assessment.gapHints,
    linkedRequirements: assessment.linkedRequirements,
  };
}

function countByStatus(cases: TestStratumCaseEntry[]): Pick<
  TestStratumChapter,
  'passedCount' | 'failedCount' | 'pendingCount' | 'skippedCount'
> {
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let skippedCount = 0;
  for (const c of cases) {
    switch (c.execution.status) {
      case 'passed':
        passedCount += 1;
        break;
      case 'failed':
        failedCount += 1;
        break;
      case 'skipped':
        skippedCount += 1;
        break;
      default:
        pendingCount += 1;
    }
  }
  return { passedCount, failedCount, pendingCount, skippedCount };
}

function countReadiness(cases: TestStratumCaseEntry[]): Pick<
  TestStratumChapter,
  'likelySufficientCount' | 'needsAttentionCount'
> {
  let likelySufficientCount = 0;
  let needsAttentionCount = 0;
  for (const c of cases) {
    if (isLikelySufficient(c.readiness)) likelySufficientCount += 1;
    if (needsAttention(c.readiness)) needsAttentionCount += 1;
  }
  return { likelySufficientCount, needsAttentionCount };
}

export function buildTestStratumCatalog(
  nodes: DocNode[],
  requirementSufficiencies: RequirementSufficiency[] = []
): TestStratumCatalog {
  const requirementById = new Map(
    requirementSufficiencies.map(s => [s.requirementId, s] as const)
  );
  const traceIndexes = buildTestStratumTraceIndexes(nodes);
  const testCases = nodes.filter(n => n.kind === 'test_case');
  const byLevel = new Map<TestLevel, DocNode[]>();
  const unassigned: DocNode[] = [];

  for (const tc of testCases) {
    if (!tc.test_level) {
      unassigned.push(tc);
      continue;
    }
    const list = byLevel.get(tc.test_level) ?? [];
    list.push(tc);
    byLevel.set(tc.test_level, list);
  }

  const chapters: TestStratumChapter[] = TEST_STRATUM_ORDER.map(level => {
    const levelNodes = (byLevel.get(level) ?? []).sort((a, b) => a.id.localeCompare(b.id));
    const cases = levelNodes.map(n => toCaseEntry(n, requirementById, traceIndexes));
    return {
      level,
      label: TEST_LEVEL_LABELS[level],
      shortLabel: TEST_LEVEL_SHORT_LABELS[level],
      cases,
      ...countByStatus(cases),
      ...countReadiness(cases),
    };
  });

  const unassignedCases = unassigned
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(n => toCaseEntry(n, requirementById, traceIndexes));

  return {
    chapters,
    unassignedCases,
    totalCases: testCases.length,
  };
}
