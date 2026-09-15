import { TraceGraph } from '../graph/TraceGraph.js';
import { isActiveRequirement } from '../models/docStatus.js';
import { isTraceabilityTestCase } from '../sufficiency/SufficiencyScorer.js';
import {
  DocNode,
  MatrixRow,
  RequirementSufficiency,
  StratumReport,
  PyramidHealthReport,
  TraceWeaveReport,
  TestLevel,
  TestMethod,
  UnitCoverageReport,
} from '../models/types.js';
import { TestCaseInputAnalyzer } from '../analyzer/TestCaseInputAnalyzer.js';
import { DecisionsCatalogBuilder } from '../decisions/DecisionsCatalogBuilder.js';
import { TraceabilityGraphBuilder } from '../graph/TraceabilityGraphBuilder.js';

function mapTestCase(tc: DocNode) {
  return {
    id: tc.id,
    title: tc.title,
    level: tc.test_level || ('unit' as TestLevel),
    method: tc.test_method || ('unit_mock' as TestMethod),
    execution_status: tc.execution_status || 'pending',
    actual_result: tc.actual_result,
  };
}

export class MatrixBuilder {
  public buildMatrix(graph: TraceGraph, sufficiencies: RequirementSufficiency[]): MatrixRow[] {
    const rows: MatrixRow[] = [];
    const suffMap = new Map(sufficiencies.map(s => [s.requirementId, s]));

    for (const req of graph.getRequirements()) {
      const upstreams = graph.getUpstream(req.id);
      const need = upstreams.find(n => n.kind === 'need');
      const suff = suffMap.get(req.id);

      const specs = graph.getSpecsForRequirement(req.id).map(spec => ({
        id: spec.id,
        title: spec.title,
        testCases: graph.getDirectTestCases(spec.id).filter(isTraceabilityTestCase).map(mapTestCase),
      }));

      const directTcs = graph
        .getDirectTestCases(req.id)
        .filter(isTraceabilityTestCase)
        .map(mapTestCase);
      const allTcs = graph
        .getAllTestCasesForRequirement(req.id)
        .filter(isTraceabilityTestCase)
        .map(mapTestCase);

      rows.push({
        needId: need?.id,
        needTitle: need?.title,
        requirementId: req.id,
        requirementTitle: req.title,
        criticality: req.criticality || 'medium',
        requirementClass: req.requirement_class,
        score: suff?.score || 0,
        specs,
        directTestCases: directTcs,
        allTestCases: allTcs,
      });
    }

    for (const spec of graph.getStandaloneSpecifications()) {
      const suff = suffMap.get(spec.id);
      const directTcs = graph.getDirectTestCases(spec.id).filter(isTraceabilityTestCase).map(mapTestCase);

      rows.push({
        needId: undefined,
        needTitle: undefined,
        requirementId: spec.id,
        requirementTitle: spec.title,
        criticality: spec.criticality || 'medium',
        requirementClass: spec.requirement_class,
        score: suff?.score || 0,
        specs: [
          {
            id: spec.id,
            title: spec.title,
            testCases: directTcs,
          },
        ],
        directTestCases: [],
        allTestCases: directTcs,
      });
    }

    return rows;
  }

  public buildReport(
    graph: TraceGraph,
    sufficiencies: RequirementSufficiency[],
    strata: StratumReport[],
    pyramid: PyramidHealthReport,
    matrix: MatrixRow[],
    unitCoverage: UnitCoverageReport
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

    const requirementNodes = graph.getRequirements();
    const functionalRequirementCount = requirementNodes.filter(r => r.requirement_class === 'functional').length;
    const nonFunctionalRequirementCount = requirementNodes.filter(r => r.requirement_class === 'non_functional').length;

    const untestedRequirements = sufficiencies
      .filter(s => s.score === 0 && isActiveRequirement(graph.getNode(s.requirementId)))
      .map(s => s.requirementId);
    const missingIntegrationRequirements = sufficiencies
      .filter(
        s =>
          isActiveRequirement(graph.getNode(s.requirementId)) &&
          s.phaseCounts.integration_internal === 0 &&
          s.phaseCounts.integration_external === 0
      )
      .map(s => s.requirementId);

    const untestedSpecs: string[] = [];
    for (const spec of graph.getSpecifications()) {
      if (graph.getDirectTestCases(spec.id).every(tc => tc.execution_status !== 'passed')) {
        untestedSpecs.push(spec.id);
      }
    }

    const allTestCases = graph.getTestCases();
    const passedTestCaseCount = allTestCases.filter(tc => tc.execution_status === 'passed').length;
    const failedTestCaseCount = allTestCases.filter(tc => tc.execution_status === 'failed').length;
    const pendingTestCaseCount = allTestCases.length - passedTestCaseCount - failedTestCaseCount;
    const inputAnalyses = TestCaseInputAnalyzer.analyzeAll(allTestCases);
    const inputModifiability = TestCaseInputAnalyzer.summarize(inputAnalyses);
    const allNodes = graph.getAllNodes();
    const catalog = DecisionsCatalogBuilder.build(allNodes);
    const visualGraph = TraceabilityGraphBuilder.buildGraph(allNodes);

    return {
      generatedAt: new Date().toISOString(),
      subject: { displayName: '', source: 'directory' },
      summary: {
        totalNeeds,
        totalRequirements,
        totalSpecifications,
        totalTestCases,
        passedTestCaseCount,
        pendingTestCaseCount,
        failedTestCaseCount,
        overallSufficiencyScore: avgScore,
        highCriticalityCoverage,
        functionalRequirementCount,
        nonFunctionalRequirementCount,
        qualityAxes: {
          traceability: {
            overallScore: avgScore,
            highCriticalityCoverage,
          },
          implementation: {
            status: unitCoverage.status,
            functionCoveragePercent: Math.round(unitCoverage.functionCoverage * 100),
            branchCoveragePercent: Math.round(unitCoverage.branchCoverage * 100),
          },
        },
      },
      strata,
      unitCoverage,
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
