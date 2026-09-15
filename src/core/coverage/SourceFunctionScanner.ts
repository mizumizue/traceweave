import fs from 'node:fs';
import path from 'node:path';

export interface SourceFunction {
  id: string;
  name: string;
  filePath: string;
  line: number;
  kind: 'function' | 'method';
  exported: boolean;
}

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'web', '.cache']);

function isScannableSource(filePath: string): boolean {
  return filePath.endsWith('.ts') && !filePath.endsWith('.d.ts') && !filePath.endsWith('.test.ts');
}

export function scanSourceFunctions(sourceRoot: string): SourceFunction[] {
  const functions: SourceFunction[] = [];
  const files = collectTsFiles(sourceRoot);

  for (const absPath of files) {
    const relPath = path.relative(sourceRoot, absPath).replace(/\\/g, '/');
    const content = fs.readFileSync(absPath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fnMatch = line.match(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
      if (fnMatch) {
        functions.push({
          id: `${relPath}::${fnMatch[1]}`,
          name: fnMatch[1],
          filePath: relPath,
          line: i + 1,
          kind: 'function',
          exported: true,
        });
      }
    }

    let classMatch: RegExpExecArray | null;
    const classRegex = /export\s+class\s+([A-Za-z_$][\w$]*)/g;
    while ((classMatch = classRegex.exec(content)) !== null) {
      const className = classMatch[1];
      const classStart = classMatch.index;
      const classBody = content.slice(classStart);
      const methodRegex = /^\s+(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm;
      let methodMatch: RegExpExecArray | null;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        const methodName = methodMatch[1];
        if (methodName === 'constructor') continue;
        const lineOffset = content.slice(0, classStart + methodMatch.index).split('\n').length;
        functions.push({
          id: `${relPath}::${className}.${methodName}`,
          name: `${className}.${methodName}`,
          filePath: relPath,
          line: lineOffset,
          kind: 'method',
          exported: true,
        });
      }
    }
  }

  return functions;
}

function collectTsFiles(root: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(root)) return results;

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (isScannableSource(full)) {
        results.push(full);
      }
    }
  };

  walk(root);
  return results.sort();
}
