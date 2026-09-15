import path from 'node:path';
import { SourceFunction, scanSourceFunctions } from './SourceFunctionScanner.js';
import { CoverageSummary, FileCoverageMetrics, loadCoverageSummary } from './CoverageReportLoader.js';
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
  untestedFunctions: SourceFunction[];
}

function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^(?:src\/)?/, '');
}

function pathsMatch(scannedPath: string, coveragePath: string): boolean {
  const a = normalizeFilePath(scannedPath);
  const b = normalizeFilePath(coveragePath);
  return a === b || a.endsWith(`/${b}`) || b.endsWith(`/${a}`);
}

function resolveDensity(functionCoverage: number): StratumDensity {
  if (functionCoverage >= 0.8) return 'heavy';
  if (functionCoverage >= 0.5) return 'adequate';
  if (functionCoverage > 0) return 'thin';
  return 'missing';
}

function findFileMetrics(
  filePath: string,
  coverage: CoverageSummary | null
): FileCoverageMetrics | undefined {
  if (!coverage) return undefined;
  const normalized = normalizeFilePath(filePath);
  return coverage.files.find(f => pathsMatch(filePath, f.filePath));
}

export class UnitCoverageAnalyzer {
  public analyze(options: {
    sourceRoot: string;
    coverageReportPath?: string;
  }): UnitCoverageReport {
    const functions = scanSourceFunctions(options.sourceRoot);
    const coverage = loadCoverageSummary(options.coverageReportPath);

    if (!coverage) {
      return {
        status: 'pending',
        totalFunctions: functions.length,
        testedFunctions: 0,
        functionCoverage: 0,
        branchCoverage: 0,
        lineCoverage: 0,
        density: 'missing',
        modules: [],
        untestedFunctions: functions,
      };
    }

    const byFile = new Map<string, SourceFunction[]>();
    for (const fn of functions) {
      const list = byFile.get(fn.filePath) ?? [];
      list.push(fn);
      byFile.set(fn.filePath, list);
    }

    const modules: ModuleCoverageReport[] = [];
    const untestedFunctions: SourceFunction[] = [];
    let testedFunctions = 0;

    for (const [filePath, fns] of byFile) {
      const metrics = findFileMetrics(filePath, coverage);
      const fileFuncCoverage = metrics?.functionCoverage ?? 0;
      const testedCount = Math.round(fns.length * fileFuncCoverage);
      testedFunctions += testedCount;

      const moduleUntested: string[] = [];
      if (fileFuncCoverage < 1) {
        const untestedCount = fns.length - testedCount;
        for (let i = 0; i < untestedCount && i < fns.length; i++) {
          moduleUntested.push(fns[i].name);
          untestedFunctions.push(fns[i]);
        }
      }

      modules.push({
        filePath,
        functionCount: fns.length,
        testedFunctionCount: testedCount,
        functionCoverage: fileFuncCoverage,
        branchCoverage: metrics?.branchCoverage ?? 0,
        lineCoverage: metrics?.lineCoverage ?? 0,
        untestedFunctions: moduleUntested,
      });
    }

    modules.sort((a, b) => a.functionCoverage - b.functionCoverage);

    const functionCoverage = coverage.summary.functionCoverage;
    const branchCoverage = coverage.summary.branchCoverage;
    const lineCoverage = coverage.summary.lineCoverage;

    return {
      status: 'available',
      generatedAt: coverage.generatedAt,
      totalFunctions: functions.length,
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
