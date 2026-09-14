import { TestCaseInputAnalyzer } from '../core/analyzer/TestCaseInputAnalyzer.js';
import { DocNode } from '../core/models/types.js';

/**
 * Post-parse enrichment for test case nodes (static spec analysis).
 * Keeps DocParser limited to static document extraction per ADR-0006.
 */
export function enrichDocNodes(nodes: DocNode[]): DocNode[] {
  return nodes.map(node => {
    if (node.kind !== 'test_case') {
      return node;
    }
    const inputAnalysis = TestCaseInputAnalyzer.analyze(node);
    return {
      ...node,
      inputAnalysis,
      ui_executable: inputAnalysis.isModifiable,
    };
  });
}
