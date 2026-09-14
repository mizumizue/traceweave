import { DocKind, DocNode } from '../models/types.js';

export class TraceGraph {
  private nodes = new Map<string, DocNode>();
  private upstreams = new Map<string, Set<string>>(); // id -> set of IDs it depends on
  private downstreams = new Map<string, Set<string>>(); // id -> set of IDs that depend on it
  private testVerifies = new Map<string, Set<string>>(); // testCaseId -> set of target IDs verified
  private verifiedByMap = new Map<string, Set<string>>(); // targetId -> set of testCaseIds verifying it

  public addNode(node: DocNode): void {
    this.nodes.set(node.id, node);

    if (!this.upstreams.has(node.id)) this.upstreams.set(node.id, new Set());
    if (!this.downstreams.has(node.id)) this.downstreams.set(node.id, new Set());
    if (!this.testVerifies.has(node.id)) this.testVerifies.set(node.id, new Set());
    if (!this.verifiedByMap.has(node.id)) this.verifiedByMap.set(node.id, new Set());

    // Record depends_on
    for (const depId of node.depends_on || []) {
      this.upstreams.get(node.id)!.add(depId);
      if (!this.downstreams.has(depId)) this.downstreams.set(depId, new Set());
      this.downstreams.get(depId)!.add(node.id);
    }

    // Record verifies if this is a test_case
    if (node.kind === 'test_case' && node.verifies) {
      for (const targetId of node.verifies) {
        this.testVerifies.get(node.id)!.add(targetId);
        if (!this.verifiedByMap.has(targetId)) this.verifiedByMap.set(targetId, new Set());
        this.verifiedByMap.get(targetId)!.add(node.id);
      }
    }

    // Record use_case actor_refs & requirement_refs
    if (node.kind === 'use_case') {
      for (const act of node.actor_refs || []) {
        this.upstreams.get(node.id)!.add(act);
        if (!this.downstreams.has(act)) this.downstreams.set(act, new Set());
        this.downstreams.get(act)!.add(node.id);
      }
      for (const req of node.requirement_refs || []) {
        this.upstreams.get(node.id)!.add(req);
        if (!this.downstreams.has(req)) this.downstreams.set(req, new Set());
        this.downstreams.get(req)!.add(node.id);
      }
    }
  }

  public getNode(id: string): DocNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): DocNode[] {
    return Array.from(this.nodes.values());
  }

  public getNodesByKind(kind: DocKind): DocNode[] {
    return this.getAllNodes().filter(n => n.kind === kind);
  }

  public getRequirements(): DocNode[] {
    return this.getNodesByKind('requirement');
  }

  public getSpecifications(): DocNode[] {
    return this.getNodesByKind('specification');
  }

  public getStandaloneSpecifications(): DocNode[] {
    return this.getSpecifications().filter(spec => {
      const upstreams = this.getUpstream(spec.id);
      return !upstreams.some(u => u.kind === 'requirement');
    });
  }

  public getTestCases(): DocNode[] {
    return this.getNodesByKind('test_case');
  }

  public getUpstream(id: string): DocNode[] {
    const ids = this.upstreams.get(id);
    if (!ids) return [];
    return Array.from(ids).map(depId => this.nodes.get(depId)).filter((n): n is DocNode => n !== undefined);
  }

  public getDownstream(id: string): DocNode[] {
    const ids = this.downstreams.get(id);
    if (!ids) return [];
    return Array.from(ids).map(depId => this.nodes.get(depId)).filter((n): n is DocNode => n !== undefined);
  }

  public getDirectTestCases(targetId: string): DocNode[] {
    const tcIds = this.verifiedByMap.get(targetId);
    if (!tcIds) return [];
    return Array.from(tcIds).map(id => this.nodes.get(id)).filter((n): n is DocNode => n !== undefined);
  }

  public getSpecsForRequirement(reqId: string): DocNode[] {
    return this.getDownstream(reqId).filter(n => n.kind === 'specification');
  }

  public getAllTestCasesForRequirement(reqId: string): DocNode[] {
    const testCases = new Map<string, DocNode>();

    // 1. Direct test cases verifying this REQ
    for (const tc of this.getDirectTestCases(reqId)) {
      testCases.set(tc.id, tc);
    }

    // 2. Test cases verifying any specification that depends on this REQ
    const specs = this.getSpecsForRequirement(reqId);
    for (const spec of specs) {
      for (const tc of this.getDirectTestCases(spec.id)) {
        testCases.set(tc.id, tc);
      }
    }

    return Array.from(testCases.values());
  }

  /**
   * Detects cycles in depends_on relationships using Tarjan's Strongly Connected Components algorithm.
   */
  public detectCycles(): string[][] {
    let index = 0;
    const indices = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];

    const strongConnect = (v: string) => {
      indices.set(v, index);
      lowlink.set(v, index);
      index++;
      stack.push(v);
      onStack.add(v);

      const neighbors = this.upstreams.get(v) || new Set();
      for (const w of neighbors) {
        if (!this.nodes.has(w)) continue;
        if (!indices.has(w)) {
          strongConnect(w);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.has(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
        }
      }

      if (lowlink.get(v) === indices.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);

        if (scc.length > 1 || (scc.length === 1 && (this.upstreams.get(scc[0])?.has(scc[0]) ?? false))) {
          sccs.push(scc);
        }
      }
    };

    for (const nodeId of this.nodes.keys()) {
      if (!indices.has(nodeId)) {
        strongConnect(nodeId);
      }
    }

    return sccs;
  }

  public detectOrphans(): DocNode[] {
    const orphans: DocNode[] = [];

    for (const [id, node] of this.nodes) {
      const up = this.upstreams.get(id)?.size || 0;
      const down = this.downstreams.get(id)?.size || 0;
      const verifiedBy = this.verifiedByMap.get(id)?.size || 0;
      const verifies = this.testVerifies.get(id)?.size || 0;
      const links = node.links?.length || 0;

      if (up === 0 && down === 0 && verifiedBy === 0 && verifies === 0 && links === 0) {
        orphans.push(node);
      }
    }

    return orphans;
  }

  public detectMissingReferences(): { fromId: string; missingId: string; type: 'depends_on' | 'verifies' }[] {
    const missing: { fromId: string; missingId: string; type: 'depends_on' | 'verifies' }[] = [];

    for (const [id, node] of this.nodes) {
      for (const dep of node.depends_on || []) {
        if (!this.nodes.has(dep)) {
          missing.push({ fromId: id, missingId: dep, type: 'depends_on' });
        }
      }
      if (node.kind === 'test_case' && node.verifies) {
        for (const target of node.verifies) {
          if (!this.nodes.has(target)) {
            missing.push({ fromId: id, missingId: target, type: 'verifies' });
          }
        }
      }
    }

    return missing;
  }
}
