import {
  DocNode,
  DocKind,
  DecisionsCatalog,
  DecisionsCatalogItem,
  DecisionsKindCounts,
  DecisionsFilterOptions,
  DecisionsReferenceItem,
} from '../models/types.js';

export class DecisionsCatalogBuilder {
  /**
   * Builds an enhanced DecisionsCatalog resolving all cross-references across documents.
   */
  public static build(nodes: DocNode[]): DecisionsCatalog {
    const nodeMap = new Map<string, DocNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // Build reverse indices
    // 1. actor_refs: actorId -> use cases that reference this actor
    const actorToUseCases = new Map<string, DocNode[]>();
    // 2. requirement_refs: reqId -> use cases that reference this req
    const reqToUseCases = new Map<string, DocNode[]>();
    // 3. depends_on: targetId -> nodes that depend on targetId
    const downstreamMap = new Map<string, DocNode[]>();
    // 4. verifies: targetId -> test cases that verify targetId
    const verifiedByMap = new Map<string, DocNode[]>();
    // 5. bidirectional links: id -> linked nodes
    const linksMap = new Map<string, Set<string>>();

    // Tag counts
    const tagCountMap = new Map<string, number>();

    // Initial kind counts
    const kindCounts: DecisionsKindCounts = {
      need: 0,
      actor: 0,
      use_case: 0,
      requirement: 0,
      specification: 0,
      design: 0,
      decision: 0,
      quality_assurance: 0,
      test_case: 0,
      total: nodes.length,
    };

    for (const node of nodes) {
      if (node.kind in kindCounts) {
        kindCounts[node.kind as keyof Omit<DecisionsKindCounts, 'total'>]++;
      }

      for (const tag of node.tags || []) {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      }

      // Index actor_refs
      if (node.actor_refs && Array.isArray(node.actor_refs)) {
        for (const actorId of node.actor_refs) {
          if (!actorToUseCases.has(actorId)) {
            actorToUseCases.set(actorId, []);
          }
          actorToUseCases.get(actorId)!.push(node);
        }
      }

      // Index requirement_refs
      if (node.requirement_refs && Array.isArray(node.requirement_refs)) {
        for (const reqId of node.requirement_refs) {
          if (!reqToUseCases.has(reqId)) {
            reqToUseCases.set(reqId, []);
          }
          reqToUseCases.get(reqId)!.push(node);
        }
      }

      // Index depends_on
      if (node.depends_on && Array.isArray(node.depends_on)) {
        for (const depId of node.depends_on) {
          if (!downstreamMap.has(depId)) {
            downstreamMap.set(depId, []);
          }
          downstreamMap.get(depId)!.push(node);
        }
      }

      // Index verifies
      if (node.verifies && Array.isArray(node.verifies)) {
        for (const targetId of node.verifies) {
          if (!verifiedByMap.has(targetId)) {
            verifiedByMap.set(targetId, []);
          }
          verifiedByMap.get(targetId)!.push(node);
        }
      }

      // Index links (bidirectional association)
      if (node.links && Array.isArray(node.links)) {
        for (const linkId of node.links) {
          if (!linksMap.has(node.id)) linksMap.set(node.id, new Set());
          linksMap.get(node.id)!.add(linkId);

          if (!linksMap.has(linkId)) linksMap.set(linkId, new Set());
          linksMap.get(linkId)!.add(node.id);
        }
      }
    }

    const toRefItem = (node: DocNode): DecisionsReferenceItem => ({
      id: node.id,
      title: node.title,
      kind: node.kind,
      role: node.sections?.['Role'] || undefined,
      level: node.test_level,
    });

    const items: DecisionsCatalogItem[] = nodes.map(node => {
      const relatedActorsMap = new Map<string, DecisionsReferenceItem>();
      const relatedUseCasesMap = new Map<string, DecisionsReferenceItem>();
      const relatedNeedsMap = new Map<string, DecisionsReferenceItem>();
      const relatedReqsMap = new Map<string, DecisionsReferenceItem>();
      const relatedSpecsMap = new Map<string, DecisionsReferenceItem>();
      const relatedDesignsMap = new Map<string, DecisionsReferenceItem>();
      const relatedDecisionsMap = new Map<string, DecisionsReferenceItem>();
      const relatedQAsMap = new Map<string, DecisionsReferenceItem>();
      const relatedTestCasesMap = new Map<string, DecisionsReferenceItem>();

      // 1. Direct depends_on (upstream)
      for (const depId of node.depends_on || []) {
        const depNode = nodeMap.get(depId);
        if (!depNode) continue;
        const ref = toRefItem(depNode);
        if (depNode.kind === 'need') relatedNeedsMap.set(ref.id, ref);
        else if (depNode.kind === 'requirement') relatedReqsMap.set(ref.id, ref);
        else if (depNode.kind === 'specification') relatedSpecsMap.set(ref.id, ref);
        else if (depNode.kind === 'design') relatedDesignsMap.set(ref.id, ref);
        else if (depNode.kind === 'decision') relatedDecisionsMap.set(ref.id, ref);
      }

      // 2. Reverse downstream (nodes depending on this node)
      const downstreams = downstreamMap.get(node.id) || [];
      for (const downNode of downstreams) {
        const ref = toRefItem(downNode);
        if (downNode.kind === 'requirement') relatedReqsMap.set(ref.id, ref);
        else if (downNode.kind === 'specification') relatedSpecsMap.set(ref.id, ref);
        else if (downNode.kind === 'design') relatedDesignsMap.set(ref.id, ref);
        else if (downNode.kind === 'quality_assurance') relatedQAsMap.set(ref.id, ref);
      }

      // 3. actor_refs & reverse actor lookup
      if (node.actor_refs) {
        for (const actorId of node.actor_refs) {
          const actorNode = nodeMap.get(actorId);
          if (actorNode) relatedActorsMap.set(actorNode.id, toRefItem(actorNode));
        }
      }
      const ucsReferencingActor = actorToUseCases.get(node.id) || [];
      for (const uc of ucsReferencingActor) {
        relatedUseCasesMap.set(uc.id, toRefItem(uc));
      }

      // 4. requirement_refs & reverse requirement lookup
      if (node.requirement_refs) {
        for (const reqId of node.requirement_refs) {
          const reqNode = nodeMap.get(reqId);
          if (reqNode) relatedReqsMap.set(reqNode.id, toRefItem(reqNode));
        }
      }
      const ucsReferencingReq = reqToUseCases.get(node.id) || [];
      for (const uc of ucsReferencingReq) {
        relatedUseCasesMap.set(uc.id, toRefItem(uc));
      }

      // 5. verifies & verifiedBy
      if (node.verifies) {
        for (const vId of node.verifies) {
          const vNode = nodeMap.get(vId);
          if (!vNode) continue;
          const ref = toRefItem(vNode);
          if (vNode.kind === 'requirement') relatedReqsMap.set(ref.id, ref);
          else if (vNode.kind === 'specification') relatedSpecsMap.set(ref.id, ref);
          else if (vNode.kind === 'design') relatedDesignsMap.set(ref.id, ref);
        }
      }
      const verifyingTcs = verifiedByMap.get(node.id) || [];
      for (const tc of verifyingTcs) {
        relatedTestCasesMap.set(tc.id, toRefItem(tc));
      }

      // 6. Bidirectional links (ADR <-> DSN etc.)
      const linkedIds = linksMap.get(node.id) || new Set<string>();
      for (const linkId of linkedIds) {
        const linkNode = nodeMap.get(linkId);
        if (!linkNode) continue;
        const ref = toRefItem(linkNode);
        if (linkNode.kind === 'decision') relatedDecisionsMap.set(ref.id, ref);
        else if (linkNode.kind === 'design') relatedDesignsMap.set(ref.id, ref);
        else if (linkNode.kind === 'specification') relatedSpecsMap.set(ref.id, ref);
        else if (linkNode.kind === 'requirement') relatedReqsMap.set(ref.id, ref);
      }

      return {
        id: node.id,
        kind: node.kind,
        title: node.title,
        status: node.status,
        scope: node.scope,
        created: node.created,
        updated: node.updated,
        tags: node.tags || [],
        links: node.links || [],
        depends_on: node.depends_on || [],
        verifies: node.verifies,
        actor_refs: node.actor_refs,
        requirement_refs: node.requirement_refs,
        sections: node.sections,
        content: node.content,
        filePath: node.filePath,
        criticality: node.criticality,
        test_level: node.test_level,
        test_method: node.test_method,
        relatedNeeds: Array.from(relatedNeedsMap.values()),
        relatedActors: Array.from(relatedActorsMap.values()),
        relatedUseCases: Array.from(relatedUseCasesMap.values()),
        relatedReqs: Array.from(relatedReqsMap.values()),
        relatedSpecs: Array.from(relatedSpecsMap.values()),
        relatedDesigns: Array.from(relatedDesignsMap.values()),
        relatedDecisions: Array.from(relatedDecisionsMap.values()),
        relatedQAs: Array.from(relatedQAsMap.values()),
        relatedTestCases: Array.from(relatedTestCasesMap.values()),
      };
    });

    const allTags = Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

    return {
      items,
      kindCounts,
      allTags,
      totalCount: items.length,
    };
  }

  /**
   * Deterministically filters items based on kind, tag, status, and search query.
   */
  public static filter(
    catalog: DecisionsCatalog,
    options: DecisionsFilterOptions = {}
  ): DecisionsCatalogItem[] {
    const { kind = 'all', tag, status = 'all', query = '' } = options;
    const cleanQuery = query.trim().toLowerCase();

    return catalog.items.filter(item => {
      // Kind filter
      if (kind !== 'all' && item.kind !== kind) {
        return false;
      }

      // Status filter
      if (status !== 'all' && item.status !== status) {
        return false;
      }

      // Tag filter
      if (tag && !item.tags.includes(tag)) {
        return false;
      }

      // Search query (case-insensitive substring in id, title, tags, or content)
      if (cleanQuery) {
        const inId = item.id.toLowerCase().includes(cleanQuery);
        const inTitle = item.title.toLowerCase().includes(cleanQuery);
        const inTags = item.tags.some(t => t.toLowerCase().includes(cleanQuery));
        const inContent = item.content.toLowerCase().includes(cleanQuery);
        const inSections = item.sections
          ? Object.entries(item.sections).some(
              ([heading, text]) =>
                heading.toLowerCase().includes(cleanQuery) ||
                text.toLowerCase().includes(cleanQuery)
            )
          : false;

        if (!inId && !inTitle && !inTags && !inContent && !inSections) {
          return false;
        }
      }

      return true;
    });
  }
}
