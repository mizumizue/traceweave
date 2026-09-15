import fs from 'node:fs';
import path from 'node:path';
import { LcovFileRecord } from './LcovParser.js';
import { findRelatedTestFiles, readTestFileLines } from './SourceTestFileResolver.js';

export type LineCoverageStatus = 'covered' | 'uncovered' | 'partial' | 'none';

export interface CoverageLineDetail {
  lineNumber: number;
  text: string;
  status: LineCoverageStatus;
}

export interface CoverageBranchBlock {
  startLine: number;
  endLine: number;
  count: number;
  covered: boolean;
}

export interface CoverageFileDetail {
  filePath: string;
  lines: CoverageLineDetail[];
  branches: CoverageBranchBlock[];
}

export interface CoverageTestFileDetail {
  filePath: string;
  lines: Array<{ lineNumber: number; text: string }>;
}

export interface CoverageFileDetailResponse {
  source: CoverageFileDetail;
  testFiles: CoverageTestFileDetail[];
}

export function encodeCoverageFileKey(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^(?:src\/)?/, '').replace(/\//g, '__');
}

export function decodeCoverageFileKey(key: string): string {
  return key.replace(/__/g, '/');
}

export function resolveCoverageFilesDir(projectRoot: string): string {
  return path.join(projectRoot, 'reports', 'coverage-files');
}

function normalizeRelativeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^(?:src\/)?/, '');
}

function resolveStatus(hasCovered: boolean, hasUncovered: boolean, hasPartial: boolean): LineCoverageStatus {
  if (hasPartial || (hasCovered && hasUncovered)) return 'partial';
  if (hasCovered) return 'covered';
  if (hasUncovered) return 'uncovered';
  return 'none';
}

export function buildCoverageFileDetail(
  relativeFilePath: string,
  source: string,
  record: LcovFileRecord
): CoverageFileDetail {
  const sourceLines = source.split('\n');
  const lineStates = sourceLines.map(() => ({
    covered: false,
    uncovered: false,
    partial: false,
  }));

  for (const [lineNumber, hits] of record.lines) {
    if (lineNumber < 1 || lineNumber > sourceLines.length) continue;
    const state = lineStates[lineNumber - 1];
    if (hits > 0) state.covered = true;
    else state.uncovered = true;
  }

  const branches: CoverageBranchBlock[] = [];
  const branchesByLine = new Map<number, LcovFileRecord['branches']>();
  for (const branch of record.branches) {
    const list = branchesByLine.get(branch.line) ?? [];
    list.push(branch);
    branchesByLine.set(branch.line, list);
  }

  for (const [lineNumber, lineBranches] of branchesByLine) {
    if (lineNumber < 1 || lineNumber > sourceLines.length) continue;
    const covered = lineBranches.some(entry => entry.taken > 0);
    const uncovered = lineBranches.some(entry => entry.taken === 0);
    const partial = covered && uncovered;
    const state = lineStates[lineNumber - 1];
    if (partial) state.partial = true;
    else if (covered) state.covered = true;
    else if (uncovered) state.uncovered = true;

    const taken = lineBranches.reduce((sum, entry) => sum + Math.max(entry.taken, 0), 0);
    branches.push({
      startLine: lineNumber,
      endLine: lineNumber,
      count: taken,
      covered,
    });
  }

  const lines: CoverageLineDetail[] = sourceLines.map((text, index) => ({
    lineNumber: index + 1,
    text,
    status: resolveStatus(
      lineStates[index].covered,
      lineStates[index].uncovered,
      lineStates[index].partial
    ),
  }));

  return {
    filePath: normalizeRelativeFilePath(relativeFilePath),
    lines,
    branches,
  };
}

export function buildAllCoverageFileDetails(
  records: LcovFileRecord[],
  sourceRoot: string
): CoverageFileDetail[] {
  const details: CoverageFileDetail[] = [];

  for (const record of records) {
    const absPath = path.join(sourceRoot, record.filePath);
    if (!fs.existsSync(absPath)) continue;

    const source = fs.readFileSync(absPath, 'utf-8');
    details.push(buildCoverageFileDetail(record.filePath, source, record));
  }

  details.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return details;
}

export function buildCoverageFileDetailResponse(
  projectRoot: string,
  detail: CoverageFileDetail
): CoverageFileDetailResponse {
  const testPaths = findRelatedTestFiles(projectRoot, detail.filePath);
  return {
    source: detail,
    testFiles: testPaths.map(testPath => ({
      filePath: testPath,
      lines: readTestFileLines(projectRoot, testPath),
    })),
  };
}

export function writeCoverageFileArtifacts(projectRoot: string, details: CoverageFileDetail[]): void {
  const outDir = resolveCoverageFilesDir(projectRoot);
  if (fs.existsSync(outDir)) {
    for (const entry of fs.readdirSync(outDir)) {
      if (entry.endsWith('.json')) {
        fs.unlinkSync(path.join(outDir, entry));
      }
    }
  } else {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const detail of details) {
    const key = encodeCoverageFileKey(detail.filePath);
    const payload = buildCoverageFileDetailResponse(projectRoot, detail);
    fs.writeFileSync(path.join(outDir, `${key}.json`), JSON.stringify(payload), 'utf-8');
  }
}

export function loadCoverageFileDetail(projectRoot: string, filePath: string): CoverageFileDetailResponse | null {
  const normalized = normalizeRelativeFilePath(filePath);
  const artifact = path.join(
    resolveCoverageFilesDir(projectRoot),
    `${encodeCoverageFileKey(normalized)}.json`
  );

  if (!fs.existsSync(artifact)) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(artifact, 'utf-8')) as CoverageFileDetailResponse | CoverageFileDetail;
    if ('source' in parsed && parsed.source?.lines) {
      return parsed;
    }
    if ('lines' in parsed && Array.isArray(parsed.lines)) {
      return buildCoverageFileDetailResponse(projectRoot, parsed as CoverageFileDetail);
    }
    return null;
  } catch {
    return null;
  }
}
