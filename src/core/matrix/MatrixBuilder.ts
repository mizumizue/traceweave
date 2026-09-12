import { TraceGraph } from '../graph/TraceGraph.js';
import {
  MatrixRow,
  RequirementSufficiency,
  StratumReport,
  PyramidHealthReport,
  TraceWeaveReport,
  TestLevel,
  TestMethod,
} from '../models/types.js';
import { TestCaseInputAnalyzer } from '../analyzer/TestCaseInputAnalyzer.js';
import { DecisionsCatalogBuilder } from '../decisions/DecisionsCatalogBuilder.js';
import { TraceabilityGraphBuilder } from '../graph/TraceabilityGraphBuilder.js';

export class MatrixBuilder {
  public buildMatrix(graph: TraceGraph, sufficiencies: RequirementSufficiency[]): MatrixRow[] {
    const rows: MatrixRow[] = [];
    const suffMap = new Map(sufficiencies.map(s => [s.requirementId, s]));

    for (const req of graph.getRequirements()) {
      const upstreams = graph.getUpstream(req.id);
      const need = upstreams.find(n => n.kind === 'need');
      const suff = suffMap.get(req.id);

      const specs = graph.getSpecsForRequirement(req.id).map(spec => {
        const specTcs = graph.getDirectTestCases(spec.id).map(tc => ({
          id: tc.id,
          title: tc.title,
          level: tc.test_level || ('unit' as TestLevel),
          method: tc.test_method || ('unit_mock' as TestMethod),
          execution_status: tc.execution_status || 'pending',
          actual_result: tc.actual_result,
        }));
        return {
          id: spec.id,
          title: spec.title,
          testCases: specTcs,
        };
      });

      const directTcs = graph.getDirectTestCases(req.id).map(tc => ({
        id: tc.id,
        title: tc.title,
        level: tc.test_level || ('unit' as TestLevel),
        method: tc.test_method || ('unit_mock' as TestMethod),
        execution_status: tc.execution_status || 'pending',
        actual_result: tc.actual_result,
      }));

      const allTcs = graph.getAllTestCasesForRequirement(req.id).map(tc => ({
        id: tc.id,
        title: tc.title,
        level: tc.test_level || ('unit' as TestLevel),
        method: tc.test_method || ('unit_mock' as TestMethod),
        execution_status: tc.execution_status || 'pending',
        actual_result: tc.actual_result,
      }));

      rows.push({
        needId: need?.id,
        needTitle: need?.title,
        requirementId: req.id,
        requirementTitle: req.title,
        criticality: req.criticality || 'medium',
        score: suff?.score || 0,
        specs,
        directTestCases: directTcs,
        allTestCases: allTcs,
      });
    }

    return rows;
  }

  public buildReport(
    graph: TraceGraph,
    sufficiencies: RequirementSufficiency[],
    strata: StratumReport[],
    pyramid: PyramidHealthReport,
    matrix: MatrixRow[]
  ): TraceWeaveReport {
    const totalNeeds = graph.getNodesByKind('need').length;
    const totalRequirements = graph.getRequirements().length;
    const totalSpecifications = graph.getSpecifications().length;
    const totalTestCases = graph.getNodesByKind('test_case').length;

    const avgScore =
      sufficiencies.length > 0
        ? Math.round(sufficiencies.reduce((acc, s) => acc + s.score, 0) / sufficiencies.length)
        : 0;

    const highReqs = sufficiencies.filter(s => s.criticality === 'high');
    const highSatisfied = highReqs.filter(s => s.isFullySatisfied).length;
    const highCriticalityCoverage =
      highReqs.length > 0 ? Math.round((highSatisfied / highReqs.length) * 100) : 100;

    const untestedRequirements = sufficiencies.filter(s => s.score === 0).map(s => s.requirementId);
    const missingIntegrationRequirements = sufficiencies
      .filter(s => s.phaseCounts.integration_internal === 0 && s.phaseCounts.integration_external === 0)
      .map(s => s.requirementId);

    const untestedSpecs: string[] = [];
    for (const spec of graph.getSpecifications()) {
      if (graph.getDirectTestCases(spec.id).length === 0) {
        untestedSpecs.push(spec.id);
      }
    }

    const allTestCases = graph.getTestCases();
    const inputAnalyses = TestCaseInputAnalyzer.analyzeAll(allTestCases);
    const inputModifiability = TestCaseInputAnalyzer.summarize(inputAnalyses);
    const allNodes = graph.getAllNodes();
    const catalog = DecisionsCatalogBuilder.build(allNodes);
    const visualGraph = TraceabilityGraphBuilder.buildGraph(allNodes);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalNeeds,
        totalRequirements,
        totalSpecifications,
        totalTestCases,
        overallSufficiencyScore: avgScore,
        highCriticalityCoverage,
      },
      strata,
      pyramid,
      requirements: sufficiencies,
      matrix,
      gaps: {
        untestedRequirements,
        missingIntegrationRequirements,
        untestedSpecs,
      },
      inputModifiability,
      catalog,
      nodes: allNodes,
      graph: visualGraph,
    };
  }
}
