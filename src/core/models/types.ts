import type { TraceGraph } from '../graph/TraceGraph.js';

export type DocKind =
  | 'need'
  | 'actor'
  | 'use_case'
  | 'requirement'
  | 'specification'
  | 'design'
  | 'decision'
  | 'quality_assurance'
  | 'test_case';

export type TestLevel =
  | 'unit'
  | 'integration_internal'
  | 'integration_external'
  | 'system'
  | 'acceptance';

export type TestMethod =
  | 'unit_mock'
  | 'unit_contract'
  | 'property_based'
  | 'api_contract'
  | 'scenario'
  | 'e2e'
  | 'performance_load'
  | 'security'
  | 'exploratory_manual';

export type Criticality = 'high' | 'medium' | 'low';

export type RequirementClass = 'functional' | 'non_functional';

export type TestExecutionStatus = 'passed' | 'failed' | 'pending' | 'skipped';

export type DocStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'deprecated';

export interface TestCasePattern {
  id: string;
  name: string;
  inputs: Record<string, any>;
  expected: any;
  actual?: any;
  status?: 'passed' | 'failed' | 'pending';
  durationMs?: number;
  error?: string;
}

export interface TestCaseDataset {
  testCaseId: string;
  name: string;
  description?: string;
  patterns: TestCasePattern[];
}

export interface TestRunRequest {
  testCaseId: string;
  inputs: Record<string, any>;
  expected?: any;
}

export interface TestRunResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'error';
  actual: any;
  expected?: any;
  isMatch?: boolean;
  durationMs: number;
  logs: string[];
  executedAt: string;
  error?: string;
}

export type InputModifiability = 'modifiable' | 'unmodifiable';

export type InputUnmodifiableReason =
  | 'external_environment_dependency'
  | 'missing_parameter_dataset'
  | 'no_pure_handler'
  | 'non_test_case';

export interface InputFieldSchema {
  name: string;
  type: string;
  sampleValue?: any;
}

export interface TestCaseInputAnalysis {
  testCaseId: string;
  title: string;
  testLevel?: TestLevel;
  testMethod?: TestMethod;
  modifiability: InputModifiability;
  isModifiable: boolean;
  classification: string;
  reasonCode?: InputUnmodifiableReason;
  reasonDescription: string;
  analysisRule: string;
  parameterFilePath?: string;
  patternsCount: number;
  fields: InputFieldSchema[];
  analyzedAt: string;
}

export interface InputModifiabilitySummary {
  totalTestCases: number;
  modifiableCount: number;
  unmodifiableCount: number;
  items: TestCaseInputAnalysis[];
}

export interface DocNode {
  id: string;
  kind: DocKind;
  title: string;
  status: DocStatus;
  created: string;
  updated: string;
  scope: 'local' | 'cross_cutting';
  criticality?: Criticality;
  requirement_class?: RequirementClass;
  test_level?: TestLevel;
  test_method?: TestMethod;
  execution_status?: TestExecutionStatus;
  actual_result?: string;
  expected_result?: string;
  objective?: string;
  steps?: string;
  evidence_log?: string;
  execution_duration_ms?: number;
  parameter_file?: string;
  parameters?: TestCaseDataset;
  inputAnalysis?: TestCaseInputAnalysis;
  ui_executable?: boolean;
  depends_on: string[];
  verifies?: string[];
  actor_refs?: string[];
  requirement_refs?: string[];
  tags: string[];
  links: string[];
  filePath?: string;
  content: string;
  sections?: Record<string, string>;
}

export type StratumDensity = 'heavy' | 'adequate' | 'thin' | 'missing';

export type PyramidHealth =
  | 'healthy'
  | 'healthy_trophy'
  | 'unbalanced'
  | 'inverted_ice_cream'
  | 'hollow_hourglass'
  | 'missing_specs';

export interface PhaseCount {
  unit: number;
  integration_internal: number;
  integration_external: number;
  system: number;
  acceptance: number;
}

export interface MethodCount {
  unit_mock: number;
  unit_contract: number;
  property_based: number;
  api_contract: number;
  scenario: number;
  e2e: number;
  performance_load: number;
  security: number;
  exploratory_manual: number;
}

export interface RequirementSufficiency {
  requirementId: string;
  title: string;
  criticality: Criticality;
  score: number;
  isFullySatisfied: boolean;
  /** Executed (passed) test counts per phase; drives score and stratum density. */
  phaseCounts: PhaseCount;
  /** Documented test counts per phase regardless of execution status. */
  documentedPhaseCounts: PhaseCount;
  methodCounts: Partial<MethodCount>;
  associatedSpecs: string[];
  testCaseIds: string[];
  executedTestCaseIds: string[];
  pendingTestCaseIds: string[];
  failedTestCaseIds: string[];
  missingPhases: TestLevel[];
}

export interface StratumReport {
  level: TestLevel;
  label: string;
  count: number;
  coverageRatio: number; // ratio of requirements covered by this phase (0 to 1)
  density: StratumDensity;
}

export interface PyramidHealthReport {
  status: PyramidHealth;
  warnings: string[];
  suggestions: string[];
}

export interface MatrixRow {
  needId?: string;
  needTitle?: string;
  requirementId: string;
  requirementTitle: string;
  criticality: Criticality;
  requirementClass?: RequirementClass;
  score: number;
  specs: {
    id: string;
    title: string;
    testCases: {
      id: string;
      title: string;
      level: TestLevel;
      method: TestMethod;
      execution_status?: TestExecutionStatus;
      actual_result?: string;
    }[];
  }[];
  directTestCases: {
    id: string;
    title: string;
    level: TestLevel;
    method: TestMethod;
    execution_status?: TestExecutionStatus;
    actual_result?: string;
  }[];
  allTestCases: {
    id: string;
    title: string;
    level: TestLevel;
    method: TestMethod;
    execution_status?: TestExecutionStatus;
    actual_result?: string;
  }[];
}

export interface DecisionsReferenceItem {
  id: string;
  title: string;
  kind?: DocKind;
  role?: string;
  level?: TestLevel;
}

export interface DecisionsCatalogItem {
  id: string;
  kind: DocKind;
  title: string;
  status: DocStatus;
  scope: 'local' | 'cross_cutting';
  created: string;
  updated: string;
  tags: string[];
  links: string[];
  depends_on: string[];
  verifies?: string[];
  actor_refs?: string[];
  requirement_refs?: string[];
  sections?: Record<string, string>;
  content: string;
  filePath?: string;
  criticality?: Criticality;
  requirement_class?: RequirementClass;
  test_level?: TestLevel;
  test_method?: TestMethod;
  // Resolved cross references
  relatedNeeds?: DecisionsReferenceItem[];
  relatedActors?: DecisionsReferenceItem[];
  relatedUseCases?: DecisionsReferenceItem[];
  relatedReqs?: DecisionsReferenceItem[];
  relatedSpecs?: DecisionsReferenceItem[];
  relatedDesigns?: DecisionsReferenceItem[];
  relatedDecisions?: DecisionsReferenceItem[];
  relatedQAs?: DecisionsReferenceItem[];
  relatedTestCases?: DecisionsReferenceItem[];
}

export interface DecisionsKindCounts {
  need: number;
  actor: number;
  use_case: number;
  requirement: number;
  specification: number;
  design: number;
  decision: number;
  quality_assurance: number;
  test_case: number;
  total: number;
}

export interface RequirementClassCounts {
  functional: number;
  non_functional: number;
  unclassified: number;
}

export interface DecisionsFilterOptions {
  kind?: DocKind | 'all';
  tag?: string;
  status?: DocStatus | 'all';
  requirementClass?: RequirementClass | 'all';
  query?: string;
}

export interface DecisionsCatalog {
  items: DecisionsCatalogItem[];
  kindCounts: DecisionsKindCounts;
  requirementClassCounts: RequirementClassCounts;
  allTags: { tag: string; count: number }[];
  totalCount: number;
}

export interface TraceWeaveReport {
  generatedAt: string;
  summary: {
    totalNeeds: number;
    totalRequirements: number;
    totalSpecifications: number;
    totalTestCases: number;
    passedTestCaseCount: number;
    pendingTestCaseCount: number;
    failedTestCaseCount: number;
    overallSufficiencyScore: number;
    highCriticalityCoverage: number;
    functionalRequirementCount: number;
    nonFunctionalRequirementCount: number;
  };
  strata: StratumReport[];
  pyramid: PyramidHealthReport;
  requirements: RequirementSufficiency[];
  matrix: MatrixRow[];
  gaps: {
    untestedRequirements: string[];
    missingIntegrationRequirements: string[];
    untestedSpecs: string[];
  };
  inputModifiability?: InputModifiabilitySummary;
  catalog?: DecisionsCatalog;
  nodes?: DocNode[];
  graph?: TraceabilityGraphData;
}

export type TraceEdgeType =
  | 'depends_on'
  | 'verifies'
  | 'actor_ref'
  | 'requirement_ref'
  | 'link';

export interface TraceGraphVisualNode {
  id: string;
  kind: DocKind;
  title: string;
  status: DocStatus;
  criticality?: Criticality;
  requirement_class?: RequirementClass;
  test_level?: TestLevel;
  test_method?: TestMethod;
  x: number;
  y: number;
  width: number;
  height: number;
  rank: number;
  rankName: string;
  isHighlighted: boolean;
  isDimmed: boolean;
  upstreamCount: number;
  downstreamCount: number;
  upstreamIds: string[];
  downstreamIds: string[];
}

export interface TraceGraphVisualEdge {
  id: string;
  source: string;
  target: string;
  type: TraceEdgeType;
  label?: string;
  isHighlighted: boolean;
  isDimmed: boolean;
}

export interface TraceGraphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface TraceGraphRankInfo {
  rank: number;
  name: string;
  description: string;
  count: number;
  x: number;
  y: number;
}

export interface TraceGraphStats {
  totalNodes: number;
  visibleNodes: number;
  totalEdges: number;
  visibleEdges: number;
  rankCounts: Record<number, number>;
}

export interface TraceGraphBuildOptions {
  traceGraph?: TraceGraph;
  kindFilter?: Set<DocKind> | DocKind[];
  excludedKinds?: Set<DocKind> | DocKind[];
  searchQuery?: string;
  selectedNodeId?: string | null;
  highlightMode?: 'all' | 'upstream' | 'downstream';
  nodeWidth?: number;
  nodeHeight?: number;
  xGap?: number;
  yGap?: number;
}

export interface TraceabilityGraphData {
  nodes: TraceGraphVisualNode[];
  edges: TraceGraphVisualEdge[];
  bounds: TraceGraphBounds;
  stats: TraceGraphStats;
  ranks: TraceGraphRankInfo[];
}

export interface TestCaseExecutionReport {
  testCaseId: string;
  status: TestExecutionStatus;
  durationMs: number;
  testTitle: string;
  errorMessage?: string;
  errorStack?: string;
  outputLog?: string;
  executedAt: string;
}

export interface TestResultsReport {
  generatedAt: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  results: Record<string, TestCaseExecutionReport>;
}
