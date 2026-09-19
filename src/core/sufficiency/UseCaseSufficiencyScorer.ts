
import { TraceGraph } from '../graph/TraceGraph.js';
import { RequirementSufficiency, UseCaseSufficiency } from '../models/types.js';

export class UseCaseSufficiencyScorer {
  public calculateAll(
    graph: TraceGraph,
    requirementSufficiencies: RequirementSufficiency[]
  ): UseCaseSufficiency[] {
    const byReqId = new Map(
      requirementSufficiencies.map(s => [s.requirementId, s] as const)
    );
    const useCases = graph.getNodesByKind('use_case');

    return useCases.map(uc => {
      const requirementIds = uc.requirement_refs ?? [];

      if (requirementIds.length === 0) {
        return {
          useCaseId: uc.id,
          title: uc.title,
          status: 'unassigned',
          requirementRefCount: 0,
          satisfiedRequirementCount: 0,
          requirementIds: [],
          unsatisfiedRequirementIds: [],
          unknownRequirementIds: [],
        };
      }

      let scoreSum = 0;
      const unknownRequirementIds: string[] = [];
      const unsatisfiedRequirementIds: string[] = [];
      let satisfiedRequirementCount = 0;

      for (const reqId of requirementIds) {
        const sufficiency = byReqId.get(reqId);
        if (!sufficiency) {
          unknownRequirementIds.push(reqId);
          unsatisfiedRequirementIds.push(reqId);
          continue;
        }
        scoreSum += sufficiency.score;
        if (sufficiency.isFullySatisfied) {
          satisfiedRequirementCount += 1;
        } else {
          unsatisfiedRequirementIds.push(reqId);
        }
      }

      const knownCount = requirementIds.length - unknownRequirementIds.length;
      const score =
        knownCount > 0 ? Math.round(scoreSum / requirementIds.length) : 0;
      const isFullySatisfied =
        unknownRequirementIds.length === 0 &&
        satisfiedRequirementCount === requirementIds.length;

      return {
        useCaseId: uc.id,
        title: uc.title,
        status: 'scored',
        score,
        isFullySatisfied,
        requirementRefCount: requirementIds.length,
        satisfiedRequirementCount,
        requirementIds,
        unsatisfiedRequirementIds,
        unknownRequirementIds,
      };
    });
  }
}
