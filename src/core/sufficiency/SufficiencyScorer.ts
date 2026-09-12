import { TraceGraph } from '../graph/TraceGraph.js';
import {
  Criticality,
  DocNode,
  MethodCount,
  PhaseCount,
  RequirementSufficiency,
  TestLevel,
  TestMethod,
} from '../models/types.js';

export class SufficiencyScorer {
  /**
   * Calculates sufficiency scores for all requirements in the graph.
   */
  public calculateAll(graph: TraceGraph): RequirementSufficiency[] {
    const requirements = graph.getRequirements();
    return requirements.map(req => this.calculateRequirement(graph, req));
  }

  /**
   * Calculates sufficiency score for a single requirement.
   */
  public calculateRequirement(graph: TraceGraph, req: DocNode): RequirementSufficiency {
    const testCases = graph.getAllTestCasesForRequirement(req.id);
    const specs = graph.getSpecsForRequirement(req.id);

    const phaseCounts: PhaseCount = {
      unit: 0,
      integration_internal: 0,
      integration_external: 0,
      system: 0,
      acceptance: 0,
    };

    const methodCounts: Partial<MethodCount> = {};

    for (const tc of testCases) {
      if (tc.test_level && tc.test_level in phaseCounts) {
        phaseCounts[tc.test_level]++;
      }
      if (tc.test_method) {
        methodCounts[tc.test_method] = (methodCounts[tc.test_method] || 0) + 1;
      }
    }

    const criticality: Criticality = req.criticality || 'medium';
    const { score, missingPhases, isFullySatisfied } = SufficiencyScorer.computeScore(criticality, phaseCounts);

    return {
      requirementId: req.id,
      title: req.title,
      criticality,
      score,
      isFullySatisfied,
      phaseCounts,
      methodCounts,
      associatedSpecs: specs.map(s => s.id),
      testCaseIds: testCases.map(t => t.id),
      missingPhases,
    };
  }

  /**
   * Computes a deterministic 0-100 score based on criticality and phase coverage.
   */
  public static computeScore(
    criticality: Criticality,
    phaseCounts: PhaseCount
  ): { score: number; missingPhases: TestLevel[]; isFullySatisfied: boolean } {
    const missingPhases: TestLevel[] = [];
    let score = 0;

    const hasUnit = phaseCounts.unit > 0;
    const hasIntInternal = phaseCounts.integration_internal > 0;
    const hasIntExternal = phaseCounts.integration_external > 0;
    const hasSystem = phaseCounts.system > 0;
    const hasAcceptance = phaseCounts.acceptance > 0;

    if (criticality === 'high') {
      // High requires:
      // - unit: 30 pts
      // - integration_internal: 25 pts
      // - integration_external or system: 25 pts
      // - acceptance: 20 pts
      if (hasUnit) score += 30;
      else missingPhases.push('unit');

      if (hasIntInternal) score += 25;
      else missingPhases.push('integration_internal');

      if (hasIntExternal || hasSystem) {
        score += 25;
      } else {
        missingPhases.push('integration_external');
        missingPhases.push('system');
      }

      if (hasAcceptance) score += 20;
      else missingPhases.push('acceptance');

      const isFullySatisfied = score >= 80;
      return { score, missingPhases, isFullySatisfied };
    }

    if (criticality === 'medium') {
      // Medium requires:
      // - unit: 50 pts
      // - integration (internal/external) or system: 50 pts
      if (hasUnit) score += 50;
      else missingPhases.push('unit');

      if (hasIntInternal || hasIntExternal || hasSystem) {
        score += 50;
      } else {
        missingPhases.push('integration_internal');
      }

      if (hasAcceptance) {
        // Bonus if acceptance exists without full unit/int
        score = Math.min(100, score + 10);
      }

      const isFullySatisfied = score >= 80;
      return { score, missingPhases, isFullySatisfied };
    }

    // Low:
    // Requires any of unit, system, or acceptance
    if (hasUnit || hasSystem || hasAcceptance || hasIntInternal || hasIntExternal) {
      score = 100;
    } else {
      missingPhases.push('unit');
      score = 0;
    }

    return { score, missingPhases, isFullySatisfied: score === 100 };
  }
}
