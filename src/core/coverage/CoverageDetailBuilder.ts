import fs from 'node:fs';
import path from 'node:path';
import { loadMergedV8Scripts, V8ScriptResult } from './V8CoverageAggregator.js';
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

export function buildLineStartOffsets(source: string): number[] {
  const starts = [0];
  let offset = 0;
  for (const line of source.split('\n')) {
    offset += Buffer.byteLength(line, 'utf-8') + 1;
    starts.push(offset);
  }
  return starts;
}

export function lineNumberForOffset(lineStarts: number[], offset: number): number {
  for (let i = lineStarts.length - 2; i >= 0; i--) {
    if (offset >= lineStarts[i]) {
      return i + 1;
    }
  }
  return 1;
}

function normalizeRelativeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^(?:src\/)?/, '');
}

function resolveStatus(hasCovered: boolean, hasUncovered: boolean): LineCoverageStatus {
  if (hasCovered && hasUncovered) return 'partial';
  if (hasCovered) return 'covered';
  if (hasUncovered) return 'uncovered';
  return 'none';
}

export function buildCoverageFileDetail(
  relativeFilePath: string,
  source: string,
  v8Entry: V8ScriptResult
): CoverageFileDetail {
  const sourceLines = source.split('\n');
  const lineStarts = buildLineStartOffsets(source);
  const lineStates = sourceLines.map(() => ({ covered: false, uncovered: false }));
  const branches: CoverageBranchBlock[] = [];

  for (const fn of v8Entry.functions) {
    for (const range of fn.ranges) {
      const startLine = lineNumberForOffset(lineStarts, range.startOffset);
      const endLine = lineNumberForOffset(lineStarts, Math.max(range.startOffset, range.endOffset - 1));
      const covered = range.count > 0;

      branches.push({
        startLine,
        endLine,
        count: range.count,
        covered,
      });

      for (let line = startLine; line <= endLine && line <= sourceLines.length; line++) {
        const state = lineStates[line - 1];
        if (covered) state.covered = true;
        else state.uncovered = true;
      }
    }
  }

  const lines: CoverageLineDetail[] = sourceLines.map((text, index) => ({
    lineNumber: index + 1,
    text,
    status: resolveStatus(lineStates[index].covered, lineStates[index].uncovered),
  }));

  return {
    filePath: normalizeRelativeFilePath(relativeFilePath),
    lines,
    branches,
  };
}

export function buildAllCoverageFileDetails(
  coverageDir: string,
  sourceRoot: string
): CoverageFileDetail[] {
  const merged = loadMergedV8Scripts(coverageDir);
  const details: CoverageFileDetail[] = [];

  for (const [url, entry] of merged) {
    const normalized = url.replace(/\\/g, '/');
    const srcIdx = normalized.indexOf('/src/');
    if (srcIdx < 0) continue;

    const relFromSrc = normalized.slice(srcIdx + '/src/'.length);
    const absPath = path.join(sourceRoot, relFromSrc);
    if (!fs.existsSync(absPath)) continue;

    const source = fs.readFileSync(absPath, 'utf-8');
    details.push(buildCoverageFileDetail(relFromSrc, source, entry));
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
