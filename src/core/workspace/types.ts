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

export interface WorkspaceTestSuiteConfig {
  id: string;
  label?: string;
  cwd: string;
  run: string;
  capture?: SuiteCaptureMode;
  fragment?: string;
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
}
