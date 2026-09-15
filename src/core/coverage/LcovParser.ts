import fs from 'node:fs';
import path from 'node:path';
import { CoverageSummary, FileCoverageMetrics } from './CoverageReportLoader.js';

export interface LcovFunctionHit {
  name: string;
  line: number;
  hitCount: number;
}

export interface LcovBranchHit {
  line: number;
  block: number;
  branch: number;
  taken: number;
}

export interface LcovFileRecord {
  filePath: string;
  functions: LcovFunctionHit[];
  branches: LcovBranchHit[];
  lines: Map<number, number>;
  lineFound: number;
  lineHit: number;
  branchFound: number;
  branchHit: number;
  functionFound: number;
  functionHit: number;
}

function normalizeRecordPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const srcIdx = normalized.indexOf('/src/');
  if (srcIdx >= 0) {
    return normalized.slice(srcIdx + '/src/'.length);
  }
  return normalized.replace(/^(?:\.\/)?src\//, '');
}

export function isScannableCoverageSource(filePath: string): boolean {
  const normalized = normalizeRecordPath(filePath);
  if (!normalized.endsWith('.ts') || normalized.endsWith('.d.ts')) return false;
  if (normalized.endsWith('.test.ts')) return false;
  if (normalized.startsWith('web/')) return false;
  return true;
}

export function parseLcov(content: string): LcovFileRecord[] {
  const records: LcovFileRecord[] = [];
  let current: LcovFileRecord | null = null;
  const functionDefs = new Map<string, { line: number; name: string }>();

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd();
    if (line === 'end_of_record') {
      if (current) {
        records.push(current);
        current = null;
        functionDefs.clear();
      }
      continue;
    }

    if (line.startsWith('SF:')) {
      const filePath = line.slice(3);
      if (!isScannableCoverageSource(filePath)) {
        current = null;
        functionDefs.clear();
        continue;
      }
      current = {
        filePath: normalizeRecordPath(filePath),
        functions: [],
        branches: [],
        lines: new Map(),
        lineFound: 0,
        lineHit: 0,
        branchFound: 0,
        branchHit: 0,
        functionFound: 0,
        functionHit: 0,
      };
      functionDefs.clear();
      continue;
    }

    if (!current) continue;

    if (line.startsWith('FN:')) {
      const [, rest] = line.split('FN:');
      const [lineNo, name] = rest.split(',');
      const parsedLine = parseInt(lineNo, 10);
      if (!Number.isNaN(parsedLine) && name) {
        functionDefs.set(name, { line: parsedLine, name });
      }
      continue;
    }

    if (line.startsWith('FNDA:')) {
      const [, rest] = line.split('FNDA:');
      const comma = rest.indexOf(',');
      if (comma < 0) continue;
      const hitCount = parseInt(rest.slice(0, comma), 10);
      const name = rest.slice(comma + 1);
      const def = functionDefs.get(name);
      if (def) {
        current.functions.push({
          name: def.name,
          line: def.line,
          hitCount: Number.isNaN(hitCount) ? 0 : hitCount,
        });
      }
      continue;
    }

    if (line.startsWith('BRDA:')) {
      const [, rest] = line.split('BRDA:');
      const parts = rest.split(',');
      if (parts.length < 4) continue;
      const parsedLine = parseInt(parts[0], 10);
      const block = parseInt(parts[1], 10);
      const branch = parseInt(parts[2], 10);
      const takenRaw = parts[3];
      const taken = takenRaw === '-' ? 0 : parseInt(takenRaw, 10);
      if (!Number.isNaN(parsedLine)) {
        current.branches.push({
          line: parsedLine,
          block: Number.isNaN(block) ? 0 : block,
          branch: Number.isNaN(branch) ? 0 : branch,
          taken: Number.isNaN(taken) ? 0 : taken,
        });
      }
      continue;
    }

    if (line.startsWith('DA:')) {
      const [, rest] = line.split('DA:');
      const [lineNo, hitsRaw] = rest.split(',');
      const parsedLine = parseInt(lineNo, 10);
      const hits = parseInt(hitsRaw, 10);
      if (!Number.isNaN(parsedLine) && !Number.isNaN(hits)) {
        current.lines.set(parsedLine, hits);
      }
      continue;
    }

    if (line.startsWith('LF:')) {
      current.lineFound = parseInt(line.slice(3), 10) || 0;
      continue;
    }

    if (line.startsWith('LH:')) {
      current.lineHit = parseInt(line.slice(3), 10) || 0;
      continue;
    }

    if (line.startsWith('BRF:')) {
      current.branchFound = parseInt(line.slice(4), 10) || 0;
      continue;
    }

    if (line.startsWith('BRH:')) {
      current.branchHit = parseInt(line.slice(4), 10) || 0;
      continue;
    }

    if (line.startsWith('FNF:')) {
      current.functionFound = parseInt(line.slice(4), 10) || 0;
      continue;
    }

    if (line.startsWith('FNH:')) {
      current.functionHit = parseInt(line.slice(4), 10) || 0;
      continue;
    }
  }

  return records;
}

function ratio(hit: number, found: number): number {
  if (found <= 0) return 0;
  return hit / found;
}

function toFileMetrics(record: LcovFileRecord): FileCoverageMetrics {
  return {
    filePath: record.filePath,
    lineCoverage: ratio(record.lineHit, record.lineFound),
    branchCoverage: ratio(record.branchHit, record.branchFound),
    functionCoverage: ratio(record.functionHit, record.functionFound),
  };
}

export function buildCoverageSummaryFromLcov(records: LcovFileRecord[]): CoverageSummary {
  const files = records.map(toFileMetrics);
  const avg = (key: keyof FileCoverageMetrics) => {
    if (files.length === 0) return 0;
    const sum = files.reduce((acc, file) => acc + (file[key] as number), 0);
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

export function loadLcovRecords(lcovPath?: string): LcovFileRecord[] | null {
  if (!lcovPath || !fs.existsSync(lcovPath)) return null;
  try {
    const content = fs.readFileSync(lcovPath, 'utf-8');
    const records = parseLcov(content);
    return records.length > 0 ? records : null;
  } catch {
    return null;
  }
}

export function resolveLcovReportPath(projectRoot: string): string {
  return path.join(projectRoot, 'reports', 'lcov.info');
}
