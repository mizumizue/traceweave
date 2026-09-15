import path from 'node:path';
import { CoverageSummary, FileCoverageMetrics, loadCoverageSummary } from './CoverageReportLoader.js';
import { LcovFileRecord, loadLcovRecords, resolveLcovReportPath } from './LcovParser.js';
import { StratumDensity } from '../models/types.js';

export interface ModuleCoverageReport {
  filePath: string;
  functionCount: number;
  testedFunctionCount: number;
  functionCoverage: number;
  branchCoverage: number;
  lineCoverage: number;
  untestedFunctions: string[];
}

export interface UnitCoverageFunctionRef {
  id: string;
  name: string;
  filePath: string;
  line: number;
  kind: 'function' | 'method';
}

export interface UnitCoverageReport {
  status: 'available' | 'pending';
  generatedAt?: string;
  totalFunctions: number;
  testedFunctions: number;
  functionCoverage: number;
  branchCoverage: number;
  lineCoverage: number;
  density: StratumDensity;
  modules: ModuleCoverageReport[];
  untestedFunctions: UnitCoverageFunctionRef[];
}

function resolveDensity(functionCoverage: number): StratumDensity {
  if (functionCoverage >= 0.8) return 'heavy';
  if (functionCoverage >= 0.5) return 'adequate';
  if (functionCoverage > 0) return 'thin';
  return 'missing';
}

function resolveFunctionKind(name: string): 'function' | 'method' {
  return name.includes('.') ? 'method' : 'function';
}

function buildModulesFromLcov(
  records: LcovFileRecord[],
  coverage: CoverageSummary
): { modules: ModuleCoverageReport[]; untestedFunctions: UnitCoverageFunctionRef[] } {
  const metricsByPath = new Map(coverage.files.map(file => [file.filePath, file]));
  const modules: ModuleCoverageReport[] = [];
  const untestedFunctions: UnitCoverageFunctionRef[] = [];

  for (const record of records) {
    const metrics = metricsByPath.get(record.filePath);
    const functionCount = record.functionFound > 0 ? record.functionFound : record.functions.length;
    const testedFunctionCount =
      record.functionHit > 0
        ? record.functionHit
        : record.functions.filter(fn => fn.hitCount > 0).length;
    const moduleUntested = record.functions
      .filter(fn => fn.hitCount === 0)
      .map(fn => fn.name);

    for (const fn of record.functions.filter(entry => entry.hitCount === 0)) {
      untestedFunctions.push({
        id: `${record.filePath}::${fn.name}`,
        name: fn.name,
        filePath: record.filePath,
        line: fn.line,
        kind: resolveFunctionKind(fn.name),
      });
    }

    modules.push({
      filePath: record.filePath,
      functionCount,
      testedFunctionCount,
      functionCoverage: metrics?.functionCoverage ?? 0,
      branchCoverage: metrics?.branchCoverage ?? 0,
      lineCoverage: metrics?.lineCoverage ?? 0,
      untestedFunctions: moduleUntested,
    });
  }

  modules.sort((a, b) => a.functionCoverage - b.functionCoverage);
  return { modules, untestedFunctions };
}

function buildModulesFromSummary(coverage: CoverageSummary): ModuleCoverageReport[] {
  return coverage.files
    .map(file => ({
      filePath: file.filePath,
      functionCount: 0,
      testedFunctionCount: 0,
      functionCoverage: file.functionCoverage,
      branchCoverage: file.branchCoverage,
      lineCoverage: file.lineCoverage,
      untestedFunctions: [] as string[],
    }))
    .sort((a, b) => a.functionCoverage - b.functionCoverage);
}

export class UnitCoverageAnalyzer {
  public analyze(options: {
    projectRoot?: string;
    coverageReportPath?: string;
    lcovReportPath?: string;
  }): UnitCoverageReport {
    const coverage = loadCoverageSummary(options.coverageReportPath);
    const lcovPath =
      options.lcovReportPath ??
      (options.projectRoot ? resolveLcovReportPath(options.projectRoot) : undefined);
    const lcovRecords = loadLcovRecords(lcovPath);

    if (!coverage) {
      return {
        status: 'pending',
        totalFunctions: 0,
        testedFunctions: 0,
        functionCoverage: 0,
        branchCoverage: 0,
        lineCoverage: 0,
        density: 'missing',
        modules: [],
        untestedFunctions: [],
      };
    }

    let modules: ModuleCoverageReport[];
    let untestedFunctions: UnitCoverageFunctionRef[] = [];
    let totalFunctions = 0;
    let testedFunctions = 0;

    if (lcovRecords) {
      const built = buildModulesFromLcov(lcovRecords, coverage);
      modules = built.modules;
      untestedFunctions = built.untestedFunctions;
      totalFunctions = lcovRecords.reduce(
        (sum, record) => sum + (record.functionFound || record.functions.length),
        0
      );
      testedFunctions = lcovRecords.reduce(
        (sum, record) =>
          sum +
          (record.functionHit > 0
            ? record.functionHit
            : record.functions.filter(fn => fn.hitCount > 0).length),
        0
      );
    } else {
      modules = buildModulesFromSummary(coverage);
    }

    const functionCoverage = coverage.summary.functionCoverage;
    const branchCoverage = coverage.summary.branchCoverage;
    const lineCoverage = coverage.summary.lineCoverage;

    return {
      status: 'available',
      generatedAt: coverage.generatedAt,
      totalFunctions,
      testedFunctions,
      functionCoverage,
      branchCoverage,
      lineCoverage,
      density: resolveDensity(functionCoverage),
      modules,
      untestedFunctions,
    };
  }

  public static resolveSourceRoot(projectRoot: string): string {
    return path.join(projectRoot, 'src');
  }
}
