import fs from 'node:fs';
import path from 'node:path';
import {
  ResolvedTestSuite,
  ResolvedWorkspace,
  TraceWeaveWorkspaceConfigFile,
  WorkspaceTestSuiteConfig,
} from '../../core/workspace/types.js';
import { workspaceConfigPath } from './resolveWorkspaceRoot.js';

function defaultSuites(workspaceRoot: string): WorkspaceTestSuiteConfig[] {
  const testsDir = path.join(workspaceRoot, 'tests');
  if (fs.existsSync(testsDir) && fs.statSync(testsDir).isDirectory()) {
    return [
      {
        id: 'default',
        label: 'Node test runner',
        cwd: '.',
        run: '',
        capture: 'node-test-tap',
        fragment: path.join('reports', 'suites', 'default.json'),
      },
    ];
  }
  const hasSrcPackage = fs.existsSync(path.join(workspaceRoot, 'src', 'package.json'));
  const run = hasSrcPackage ? 'npm --prefix src test' : 'npm test';
  return [
    {
      id: 'default',
      label: 'Default test suite',
      cwd: '.',
      run,
      capture: 'aggregate',
    },
  ];
}

function resolveSuite(
  workspaceRoot: string,
  evidenceDir: string,
  suite: WorkspaceTestSuiteConfig,
  index: number
): ResolvedTestSuite {
  const id = suite.id?.trim() || `suite-${index + 1}`;
  const capture = suite.capture ?? (suite.fragment ? 'fragment' : 'aggregate');
  let fragmentPath: string | null = null;
  if (capture === 'fragment' || capture === 'node-test-tap') {
    const rel = suite.fragment ?? path.join(evidenceDir, 'suites', `${id}.json`);
    fragmentPath = path.join(workspaceRoot, rel);
  }
  const testsDirRel = suite.testsDir?.trim();
  const testsDir = testsDirRel ? path.join(workspaceRoot, testsDirRel) : null;
  return {
    id,
    label: suite.label?.trim() || id,
    cwd: suite.cwd?.trim() || '.',
    run: suite.run?.trim() || 'npm test',
    capture,
    fragmentPath,
    evidenceTier: suite.evidenceTier === 'supplementary' ? 'supplementary' : 'formal',
    testsDir,
  };
}

export function loadWorkspaceConfig(workspaceRoot: string): ResolvedWorkspace {
  const root = path.resolve(workspaceRoot);
  const configPath = workspaceConfigPath(root);
  let raw: TraceWeaveWorkspaceConfigFile = {};

  if (fs.existsSync(configPath)) {
    try {
      raw = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as TraceWeaveWorkspaceConfigFile;
    } catch {
      throw new Error(`Invalid JSON in ${configPath}`);
    }
  }

  const evidenceDir = raw.evidenceDir?.trim() || 'reports';
  const docsDir = path.join(root, raw.docsDir?.trim() || 'docs');
  const aggregateRel = raw.testResults?.aggregate?.trim() || path.join(evidenceDir, 'test-results.json');
  const testResultsAggregatePath = path.join(root, aggregateRel);
  const coverageLcovPath = path.join(
    root,
    raw.coverage?.lcov?.trim() || path.join(evidenceDir, 'lcov.info')
  );
  const coverageSummaryPath = path.join(
    root,
    raw.coverage?.summary?.trim() || path.join(evidenceDir, 'coverage-summary.json')
  );

  const suiteConfigs = raw.suites?.length ? raw.suites : defaultSuites(root);
  const suites = suiteConfigs.map((s, i) => resolveSuite(root, evidenceDir, s, i));

  return {
    workspaceRoot: root,
    configPath: fs.existsSync(configPath) ? configPath : null,
    displayName: raw.displayName?.trim(),
    docsDir,
    evidenceDir: path.join(root, evidenceDir),
    testResultsAggregatePath,
    coverageLcovPath,
    coverageSummaryPath,
    mergeStrategy: raw.merge?.onConflict === 'last-wins' ? 'last-wins' : 'fail-wins',
    suites,
  };
}

export function readWorkspaceConfigFile(workspaceRoot: string): TraceWeaveWorkspaceConfigFile | null {
  const configPath = workspaceConfigPath(workspaceRoot);
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as TraceWeaveWorkspaceConfigFile;
  } catch {
    return null;
  }
}
