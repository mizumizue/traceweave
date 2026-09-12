import path from 'node:path';
import { DocParser } from '../infrastructure/parser/DocParser.js';
import { SQLiteCache } from '../infrastructure/storage/SQLiteCache.js';
import { SufficiencyScorer } from '../core/sufficiency/SufficiencyScorer.js';
import { BalanceAnalyzer } from '../core/analyzer/BalanceAnalyzer.js';
import { MatrixBuilder } from '../core/matrix/MatrixBuilder.js';
import { TraceGraph } from '../core/graph/TraceGraph.js';
import { TraceWeaveReport, DocNode } from '../core/models/types.js';

export interface BuildReportOptions {
  docsDir?: string;
  cacheDbPath?: string;
  useCache?: boolean;
}

export function buildTraceWeaveReport(options: BuildReportOptions = {}): {
  report: TraceWeaveReport;
  graph: TraceGraph;
  nodes: DocNode[];
} {
  const docsDir = path.resolve(options.docsDir || './docs');
  const cachePath = options.useCache !== false ? options.cacheDbPath || './.cache/traceweave.sqlite' : undefined;

  let cache: SQLiteCache | undefined;
  if (cachePath) {
    cache = new SQLiteCache(cachePath);
  }

  const parser = new DocParser(cache);
  const nodes = parser.parseDirectory(docsDir);

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
  const strata = analyzer.analyzeStrata(sufficiencies, graph.getRequirements().length);
  const pyramid = analyzer.diagnosePyramid(graph, strata, sufficiencies);

  const builder = new MatrixBuilder();
  const matrix = builder.buildMatrix(graph, sufficiencies);
  const report = builder.buildReport(graph, sufficiencies, strata, pyramid, matrix);

  return { report, graph, nodes };
}
