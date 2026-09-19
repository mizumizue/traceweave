import { TraceGraph } from '../graph/TraceGraph.js';
import { isActiveTestCase } from '../models/docStatus.js';
import {
  Criticality,
  DocNode,
  MethodCount,
  PhaseCount,
  RequirementSufficiency,
  TestLevel,
} from '../models/types.js';

/** Unit tests verify implementation, not REQ/SPEC contracts. Exclude from traceability sufficiency. */
export const TRACEABILITY_TEST_LEVELS: TestLevel[] = [
  'integration_internal',
  'integration_external',
  'system',
  'acceptance',
];

export function isTraceabilityTestCase(tc: DocNode): boolean {
  return (
    isActiveTestCase(tc) &&
    Boolean(tc.test_level && TRACEABILITY_TEST_LEVELS.includes(tc.test_level))
  );
}

export function emptyPhaseCounts(): PhaseCount {
  return {
    unit: 0,
    integration_internal: 0,
    integration_external: 0,
    system: 0,
    acceptance: 0,
  };
}

function executionStatus(tc: DocNode): NonNullable<DocNode['execution_status']> {
  return tc.execution_status ?? 'pending';
}

export type TallyTestCasesResult = {
  documentedPhaseCounts: PhaseCount;
  executedPhaseCounts: PhaseCount;
  methodCounts: Partial<MethodCount>;
  testCaseIds: string[];
  executedTestCaseIds: string[];
  pendingTestCaseIds: string[];
  failedTestCaseIds: string[];
};

export class SufficiencyScorer {
  public calculateAll(graph: TraceGraph): RequirementSufficiency[] {
    const requirements = graph.getRequirements();
    const reqSufficiencies = requirements.map(req => this.calculateRequirement(graph, req));
    const standaloneSpecs = graph.getStandaloneSpecifications();
    const specSufficiencies = standaloneSpecs.map(spec => this.calculateStandaloneSpec(graph, spec));
    return [...reqSufficiencies, ...specSufficiencies];
  }

  public calculateStandaloneSpec(graph: TraceGraph, spec: DocNode): RequirementSufficiency {
    return this.toSufficiency(
      spec,
      spec.criticality || 'medium',
      SufficiencyScorer.tallyTestCases(
        graph.getDirectTestCases(spec.id).filter(isTraceabilityTestCase)
      ),
      [spec.id]
    );
  }

  public calculateRequirement(graph: TraceGraph, req: DocNode): RequirementSufficiency {
    return this.toSufficiency(
      req,
      req.criticality || 'medium',
      SufficiencyScorer.tallyTestCases(
        graph.getAllTestCasesForRequirement(req.id).filter(isTraceabilityTestCase)
      ),
      graph.getSpecsForRequirement(req.id).map(s => s.id)
    );
  }

  private toSufficiency(
    node: DocNode,
    criticality: Criticality,
    tallied: TallyTestCasesResult,
    associatedSpecs: string[]
  ): RequirementSufficiency {
    const { score, missingPhases, isFullySatisfied } = SufficiencyScorer.computeScore(
      criticality,
      tallied.executedPhaseCounts
    );
    return {
      requirementId: node.id,
      title: node.title,
      criticality,
      score,
      isFullySatisfied,
      phaseCounts: tallied.executedPhaseCounts,
      documentedPhaseCounts: tallied.documentedPhaseCounts,
      methodCounts: tallied.methodCounts,
      associatedSpecs,
      testCaseIds: tallied.testCaseIds,
      executedTestCaseIds: tallied.executedTestCaseIds,
      pendingTestCaseIds: tallied.pendingTestCaseIds,
      failedTestCaseIds: tallied.failedTestCaseIds,
      missingPhases,
    };
  }

  /** Tallies documented vs executed (passed-only) phase counts and execution-status buckets. */
  public static tallyTestCases(testCases: DocNode[]): TallyTestCasesResult {
    const documentedPhaseCounts = emptyPhaseCounts();
    const executedPhaseCounts = emptyPhaseCounts();
    const methodCounts: Partial<MethodCount> = {};
    const testCaseIds: string[] = [];
    const executedTestCaseIds: string[] = [];
    const pendingTestCaseIds: string[] = [];
    const failedTestCaseIds: string[] = [];

    for (const tc of testCases) {
      testCaseIds.push(tc.id);
      if (tc.test_level && tc.test_level in documentedPhaseCounts) {
        documentedPhaseCounts[tc.test_level]++;
      }
      if (tc.test_method) {
        methodCounts[tc.test_method] = (methodCounts[tc.test_method] || 0) + 1;
      }
      const status = executionStatus(tc);
      if (status === 'passed') {
        executedTestCaseIds.push(tc.id);
        if (tc.test_level && tc.test_level in executedPhaseCounts) {
          executedPhaseCounts[tc.test_level]++;
        }
      } else if (status === 'failed') {
        failedTestCaseIds.push(tc.id);
      } else {
        pendingTestCaseIds.push(tc.id);
      }
    }

    return {
      documentedPhaseCounts,
      executedPhaseCounts,
      methodCounts,
      testCaseIds,
      executedTestCaseIds,
      pendingTestCaseIds,
      failedTestCaseIds,
    };
  }

  public static computeScore(
    criticality: Criticality,
    phaseCounts: PhaseCount
  ): { score: number; missingPhases: TestLevel[]; isFullySatisfied: boolean } {
    const missingPhases: TestLevel[] = [];
    let score = 0;
    const hasIntInternal = phaseCounts.integration_internal > 0;
    const hasIntExternal = phaseCounts.integration_external > 0;
    const hasSystem = phaseCounts.system > 0;
    const hasAcceptance = phaseCounts.acceptance > 0;

    if (criticality === 'high') {
      if (hasIntInternal) score += 35;
      else missingPhases.push('integration_internal');
      if (hasIntExternal || hasSystem) {
        score += 35;
      } else {
        missingPhases.push('integration_external');
        missingPhases.push('system');
      }
      if (hasAcceptance) score += 30;
      else missingPhases.push('acceptance');
      return { score, missingPhases, isFullySatisfied: score >= 80 };
    }

    if (criticality === 'medium') {
      if (hasIntInternal) score += 50;
      else missingPhases.push('integration_internal');
      if (hasIntExternal || hasSystem) {
        score += 50;
      } else {
        missingPhases.push('integration_external');
      }
      if (hasAcceptance) {
        score = Math.min(100, score + 10);
      }
      return { score, missingPhases, isFullySatisfied: score >= 80 };
    }

    if (hasSystem || hasAcceptance || hasIntInternal || hasIntExternal) {
      score = 100;
    } else {
      missingPhases.push('integration_internal');
      score = 0;
    }
    return { score, missingPhases, isFullySatisfied: score === 100 };
  }
}
