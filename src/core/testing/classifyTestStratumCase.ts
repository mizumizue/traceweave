import {
  DocNode,
  RequirementClass,
  TestStratumCaseClassification,
  TestStratumUseCaseRef,
} from '../models/types.js';

export interface TestStratumTraceIndexes {
  nodeById: Map<string, DocNode>;
  requirementClassById: Map<string, RequirementClass>;
  useCasesByRequirementId: Map<string, TestStratumUseCaseRef[]>;
}

export function buildTestStratumTraceIndexes(nodes: DocNode[]): TestStratumTraceIndexes {
  const nodeById = new Map<string, DocNode>();
  const requirementClassById = new Map<string, RequirementClass>();
  const useCasesByRequirementId = new Map<string, TestStratumUseCaseRef[]>();

  for (const node of nodes) {
    nodeById.set(node.id, node);
    if (node.kind === 'requirement' && node.requirement_class) {
      requirementClassById.set(node.id, node.requirement_class);
    }
    if (node.kind === 'use_case') {
      const ref: TestStratumUseCaseRef = { id: node.id, title: node.title };
      for (const reqId of node.requirement_refs ?? []) {
        const list = useCasesByRequirementId.get(reqId) ?? [];
        list.push(ref);
        useCasesByRequirementId.set(reqId, list);
      }
    }
  }

  return { nodeById, requirementClassById, useCasesByRequirementId };
}

function requirementIdsFromVerifies(
  verifies: string[],
  indexes: TestStratumTraceIndexes
): string[] {
  const reqIds = new Set<string>();
  for (const ref of verifies) {
    if (ref.startsWith('REQ-')) {
      reqIds.add(ref);
      continue;
    }
    if (ref.startsWith('SPEC-')) {
      const spec = indexes.nodeById.get(ref);
      for (const dep of spec?.depends_on ?? []) {
        if (dep.startsWith('REQ-')) reqIds.add(dep);
      }
    }
  }
  return [...reqIds].sort();
}

export function classifyTestStratumCase(
  verifies: string[],
  indexes: TestStratumTraceIndexes
): TestStratumCaseClassification {
  const requirementClasses = new Set<RequirementClass>();
  const useCaseMap = new Map<string, TestStratumUseCaseRef>();

  for (const reqId of requirementIdsFromVerifies(verifies, indexes)) {
    const cls = indexes.requirementClassById.get(reqId);
    if (cls) requirementClasses.add(cls);
    for (const uc of indexes.useCasesByRequirementId.get(reqId) ?? []) {
      useCaseMap.set(uc.id, uc);
    }
  }

  return {
    useCases: [...useCaseMap.values()].sort((a, b) => a.id.localeCompare(b.id)),
    requirementClasses: [...requirementClasses].sort(),
  };
}
