import fs from 'node:fs';
import path from 'node:path';
import { CoverageSummary, FileCoverageMetrics } from './CoverageReportLoader.js';

export interface V8Range {
  startOffset: number;
  endOffset: number;
  count: number;
}

export interface V8Function {
  functionName: string;
  ranges: V8Range[];
  isBlockCoverage: boolean;
}

export interface V8ScriptResult {
  url: string;
  functions: V8Function[];
}

interface V8CoverageFile {
  result: V8ScriptResult[];
}

function isProjectSourceUrl(url: string): boolean {
  const normalized = url.replace(/\\/g, '/');
  if (!normalized.includes('/src/')) return false;
  if (normalized.includes('/src/web/')) return false;
  if (normalized.includes('.test.')) return false;
  return normalized.endsWith('.ts');
}

function urlToRelativePath(url: string): string {
  const normalized = url.replace(/\\/g, '/');
  const idx = normalized.indexOf('/src/');
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

export function loadMergedV8Scripts(coverageDir: string): Map<string, V8ScriptResult> {
  if (!fs.existsSync(coverageDir)) return new Map();

  const files = fs
    .readdirSync(coverageDir)
    .filter(name => name.startsWith('coverage-') && name.endsWith('.json'))
    .map(name => path.join(coverageDir, name));

  return mergeV8Results(files);
}

function mergeV8Results(files: string[]): Map<string, V8ScriptResult> {
  const byUrl = new Map<string, V8ScriptResult>();

  for (const file of files) {
    let parsed: V8CoverageFile;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as V8CoverageFile;
    } catch {
      continue;
    }
    for (const entry of parsed.result ?? []) {
      if (!isProjectSourceUrl(entry.url)) continue;
      const existing = byUrl.get(entry.url);
      if (!existing) {
        byUrl.set(entry.url, entry);
        continue;
      }
      existing.functions.push(...entry.functions);
    }
  }

  return byUrl;
}

function metricsForScript(entry: V8ScriptResult): FileCoverageMetrics {
  let totalFuncs = 0;
  let coveredFuncs = 0;
  let totalBranches = 0;
  let coveredBranches = 0;
  let totalLines = 0;
  let coveredLines = 0;

  for (const fn of entry.functions) {
    if (!fn.ranges.length) continue;
    totalFuncs += 1;
    const hit = fn.ranges.some(r => r.count > 0);
    if (hit) coveredFuncs += 1;

    for (const range of fn.ranges) {
      if (fn.isBlockCoverage) {
        totalBranches += 1;
        if (range.count > 0) coveredBranches += 1;
      } else {
        totalLines += 1;
        if (range.count > 0) coveredLines += 1;
      }
    }
  }

  return {
    filePath: urlToRelativePath(entry.url),
    functionCoverage: totalFuncs > 0 ? coveredFuncs / totalFuncs : 0,
    branchCoverage: totalBranches > 0 ? coveredBranches / totalBranches : 0,
    lineCoverage: totalLines > 0 ? coveredLines / totalLines : 0,
  };
}

export function aggregateV8CoverageDirectory(coverageDir: string): CoverageSummary | null {
  const merged = loadMergedV8Scripts(coverageDir);
  const fileMetrics = [...merged.values()].map(metricsForScript);
  if (fileMetrics.length === 0) return null;

  const avg = (key: keyof FileCoverageMetrics) => {
    const sum = fileMetrics.reduce((acc, f) => acc + (f[key] as number), 0);
    return sum / fileMetrics.length;
  };

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      functionCoverage: avg('functionCoverage'),
      branchCoverage: avg('branchCoverage'),
      lineCoverage: avg('lineCoverage'),
    },
    files: fileMetrics,
  };
}
