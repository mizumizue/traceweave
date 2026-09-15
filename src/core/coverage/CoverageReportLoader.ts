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

function indentDepth(label: string): number {
  const leading = label.match(/^(\s*)/)?.[1] ?? '';
  return Math.floor(leading.length / 2);
}

export function parseCoverageTable(output: string): CoverageSummary | null {
  const files: FileCoverageMetrics[] = [];
  const lines = output.split('\n');
  const pathByDepth: string[] = [];

  for (const line of lines) {
    const allMatch = line.match(
      /^#\s+all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|/
    );
    if (allMatch) {
      return {
        generatedAt: new Date().toISOString(),
        summary: {
          lineCoverage: parseFloat(allMatch[1]) / 100,
          branchCoverage: parseFloat(allMatch[2]) / 100,
          functionCoverage: parseFloat(allMatch[3]) / 100,
        },
        files,
      };
    }

    const rowMatch = line.match(/^#\s+(.+?)\s+\|/);
    if (!rowMatch) continue;

    const rawLabel = rowMatch[1];
    const depth = indentDepth(rawLabel);
    const label = rawLabel.trim();
    const metricsMatch = line.match(
      /\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|/
    );

    pathByDepth[depth] = label;
    pathByDepth.length = depth + 1;

    if (!metricsMatch || !label.endsWith('.ts')) continue;

    const filePath = pathByDepth.slice(0, depth + 1).join('/');
    files.push({
      filePath,
      lineCoverage: parseFloat(metricsMatch[1]) / 100,
      branchCoverage: parseFloat(metricsMatch[2]) / 100,
      functionCoverage: parseFloat(metricsMatch[3]) / 100,
    });
  }

  return files.length > 0 ? buildSummary(files) : null;
}

function buildSummary(files: FileCoverageMetrics[]): CoverageSummary {
  const avg = (key: keyof FileCoverageMetrics) => {
    if (files.length === 0) return 0;
    const sum = files.reduce((acc, f) => acc + (f[key] as number), 0);
    return sum / files.length;
  };

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      lineCoverage: avg('lineCoverage'),
      branchCoverage: avg('branchCoverage'),
      functionCoverage: avg('functionCoverage'),
    },
    files,
  };
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
