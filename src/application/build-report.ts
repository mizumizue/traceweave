import path from 'node:path';
import fs from 'node:fs';
import { DocParser } from '../infrastructure/parser/DocParser.js';
import { resolveProjectLayout } from '../infrastructure/system/resolveRepoRoot.js';
import { DocMtimeCache } from '../infrastructure/storage/DocMtimeCache.js';
import { TestReportLoader } from '../infrastructure/testing/TestReportLoader.js';
import { SufficiencyScorer } from '../core/sufficiency/SufficiencyScorer.js';
import { BalanceAnalyzer } from '../core/analyzer/BalanceAnalyzer.js';
import { MatrixBuilder } from '../core/matrix/MatrixBuilder.js';
import { TraceGraph } from '../core/graph/TraceGraph.js';
import { TraceWeaveReport, DocNode } from '../core/models/types.js';
import { enrichDocNodes } from './enrich-doc-nodes.js';
import { resolveSubjectContext } from './resolve-subject-context.js';

export interface BuildReportOptions {
  docsDir?: string;
  cacheDbPath?: string;
  useCache?: boolean;
  testReportPath?: string;
  loadTestReport?: boolean;
  projectRoot?: string;
  subjectOverride?: string;
}

export function buildTraceWeaveReport(options: BuildReportOptions = {}): {
  report: TraceWeaveReport;
  graph: TraceGraph;
  nodes: DocNode[];
  parseWarnings: string[];
} {
  const { projectRoot, docsDir } = resolveProjectLayout({
    docsDir: options.docsDir,
    projectRoot: options.projectRoot,
    moduleUrl: import.meta.url,
  });
  if (!fs.existsSync(docsDir) || !fs.statSync(docsDir).isDirectory()) {
    throw new Error(`Docs directory not found: ${docsDir}`);
  }
  const cachePath =
    options.useCache !== false
      ? options.cacheDbPath || path.join(projectRoot, 'src/.cache/traceweave-cache.json')
      : undefined;

  let cache: DocMtimeCache | undefined;
  if (cachePath) {
    cache = new DocMtimeCache(cachePath);
  }

  const parser = new DocParser(cache);
  const parsedNodes = parser.parseDirectory(docsDir);
  const parseWarnings = parser.getLastWarnings();
  const enrichedNodes = enrichDocNodes(parsedNodes);

  const reportData =
    options.loadTestReport !== false
      ? TestReportLoader.loadReport(options.testReportPath)
      : null;
  const nodes = TestReportLoader.mergeReportIntoNodes(enrichedNodes, reportData);

  const graph = new TraceGraph();
  for (const node of nodes) {
    graph.addNode(node);
  }

  if (cache) {
    cache.close();
  }

  const scorer = new SufficiencyScorer();
  const sufficiencies = scorer.calculateAll(graph);

  const analyzer = new BalanceAnalyzer();
  const totalItems = graph.getRequirements().length + graph.getStandaloneSpecifications().length;
  const strata = analyzer.analyzeStrata(sufficiencies, totalItems);
  const pyramid = analyzer.diagnosePyramid(graph, strata, sufficiencies);

  const builder = new MatrixBuilder();
  const matrix = builder.buildMatrix(graph, sufficiencies);
  const report = builder.buildReport(graph, sufficiencies, strata, pyramid, matrix);
  report.subject = resolveSubjectContext({
    repoRoot: projectRoot,
    cliSubject: options.subjectOverride,
  });

  return { report, graph, nodes, parseWarnings };
}
