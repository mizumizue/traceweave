export type TestResultsMergeStrategy = 'fail-wins' | 'last-wins';

export type SuiteCaptureMode =
  | 'fragment'
  | 'aggregate'
  | 'node-test-tap';

export interface TraceWeaveWorkspaceConfigFile {
  schemaVersion?: number;
  displayName?: string;
  docsDir?: string;
  evidenceDir?: string;
  testResults?: {
    aggregate?: string;
    format?: 'traceweave-v1';
  };
  coverage?: {
    lcov?: string;
    summary?: string;
  };
  merge?: {
    onConflict?: TestResultsMergeStrategy;
  };
  suites?: WorkspaceTestSuiteConfig[];
}

export type SuiteEvidenceTier = 'formal' | 'supplementary';

export interface WorkspaceTestSuiteConfig {
  id: string;
  label?: string;
  cwd: string;
  run: string;
  capture?: SuiteCaptureMode;
  fragment?: string;
  /** formal (default): merges into aggregate test-results. supplementary: harness only (ADR-0011). */
  evidenceTier?: SuiteEvidenceTier;
  /** Relative to workspace root; node-test-tap only. Default: tests/ with support/e2e excluded. */
  testsDir?: string;
}

export interface ResolvedWorkspace {
  workspaceRoot: string;
  configPath: string | null;
  displayName?: string;
  docsDir: string;
  evidenceDir: string;
  testResultsAggregatePath: string;
  coverageLcovPath: string;
  coverageSummaryPath: string;
  mergeStrategy: TestResultsMergeStrategy;
  suites: ResolvedTestSuite[];
}

export interface ResolvedTestSuite {
  id: string;
  label: string;
  cwd: string;
  run: string;
  capture: SuiteCaptureMode;
  fragmentPath: string | null;
  evidenceTier: SuiteEvidenceTier;
  testsDir: string | null;
}
