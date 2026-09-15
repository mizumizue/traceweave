import fs from 'node:fs';
import path from 'node:path';

function normalizeSourcePath(sourceRelPath: string): string {
  return sourceRelPath.replace(/\\/g, '/').replace(/^(?:src\/)?/, '').replace(/\.ts$/, '');
}

function collectTestFiles(testsRoot: string): string[] {
  if (!fs.existsSync(testsRoot)) return [];

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.test\.ts$/.test(entry.name)) {
        files.push(full);
      }
    }
  };
  walk(testsRoot);
  return files;
}

function importNeedles(sourceRelPath: string): string[] {
  const normalized = normalizeSourcePath(sourceRelPath);
  const baseName = path.basename(normalized);
  return [ `${normalized}.js`, normalized, `${baseName}.js`, baseName ];
}

function fileImportsSource(testContent: string, needles: string[]): boolean {
  for (const line of testContent.split('\n')) {
    if (!line.includes('import') && !line.includes('from')) continue;
    if (needles.some(needle => line.includes(needle))) {
      return true;
    }
  }
  return false;
}

export function findRelatedTestFiles(projectRoot: string, sourceRelPath: string): string[] {
  const testsRoot = path.join(projectRoot, 'tests');
  const needles = importNeedles(sourceRelPath);
  const matches: string[] = [];

  for (const absPath of collectTestFiles(testsRoot)) {
    const content = fs.readFileSync(absPath, 'utf-8');
    if (fileImportsSource(content, needles)) {
      matches.push(path.relative(projectRoot, absPath).replace(/\\/g, '/'));
    }
  }

  return matches.sort((a, b) => a.localeCompare(b));
}

export function readTestFileLines(projectRoot: string, testRelPath: string): Array<{ lineNumber: number; text: string }> {
  const absPath = path.join(projectRoot, testRelPath);
  if (!fs.existsSync(absPath)) return [];

  return fs.readFileSync(absPath, 'utf-8').split('\n').map((text, index) => ({
    lineNumber: index + 1,
    text,
  }));
}
