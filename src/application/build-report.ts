import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DocParser } from '../infrastructure/parser/DocParser.js';
import { SQLiteCache } from '../infrastructure/storage/SQLiteCache.js';
import { TestReportLoader } from '../infrastructure/testing/TestReportLoader.js';
import { SufficiencyScorer } from '../core/sufficiency/SufficiencyScorer.js';
import { BalanceAnalyzer } from '../core/analyzer/BalanceAnalyzer.js';
import { MatrixBuilder } from '../core/matrix/MatrixBuilder.js';
import { TraceGraph } from '../core/graph/TraceGraph.js';
import { TraceWeaveReport, DocNode } from '../core/models/types.js';

export interface BuildReportOptions {
  docsDir?: string;
  cacheDbPath?: string;
  useCache?: boolean;
  testReportPath?: string;
  loadTestReport?: boolean;
}

export function buildTraceWeaveReport(options: BuildReportOptions = {}): {
  report: TraceWeaveReport;
  graph: TraceGraph;
  nodes: DocNode[];
} {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const docsDir = options.docsDir
    ? path.resolve(options.docsDir)
    : path.join(projectRoot, 'docs');
  if (!fs.existsSync(docsDir) || !fs.statSync(docsDir).isDirectory()) {
    throw new Error(`Docs directory not found: ${docsDir}`);
  }
  const cachePath =
    options.useCache !== false
      ? options.cacheDbPath || path.join(projectRoot, '.cache/traceweave.sqlite')
      : undefined;

  let cache: SQLiteCache | undefined;
  if (cachePath) {
    cache = new SQLiteCache(cachePath);
  }

  const parser = new DocParser(cache);
  const rawNodes = parser.parseDirectory(docsDir);

  const reportData =
    options.loadTestReport !== false
      ? TestReportLoader.loadReport(options.testReportPath)
      : null;
  const nodes = TestReportLoader.mergeReportIntoNodes(rawNodes, reportData);

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

  return { report, graph, nodes };
}
