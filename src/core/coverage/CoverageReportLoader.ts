import fs from 'node:fs';
import path from 'node:path';

export interface FileCoverageMetrics {
  filePath: string;
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
}

export interface CoverageSummary {
  generatedAt: string;
  summary: {
    lineCoverage: number;
    branchCoverage: number;
    functionCoverage: number;
  };
  files: FileCoverageMetrics[];
}

export function loadCoverageSummary(reportPath?: string): CoverageSummary | null {
  if (!reportPath || !fs.existsSync(reportPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as CoverageSummary;
    if (!raw.summary || !Array.isArray(raw.files)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function resolveCoverageReportPath(projectRoot: string): string {
  return path.join(projectRoot, 'reports', 'coverage-summary.json');
}
