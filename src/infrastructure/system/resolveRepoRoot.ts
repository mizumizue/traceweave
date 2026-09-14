import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Walk upward from a module location until docs/ and src/package.json coexist.
 * Works for both source (src/**) and compiled (src/dist/**) entrypoints.
 */
export function resolveRepoRoot(moduleUrl: string = import.meta.url): string {
  let dir = path.dirname(fileURLToPath(moduleUrl));
  const fsRoot = path.parse(dir).root;

  while (dir !== fsRoot) {
    const hasDocs = fs.existsSync(path.join(dir, 'docs'));
    const hasSrcPackage = fs.existsSync(path.join(dir, 'src', 'package.json'));
    if (hasDocs && hasSrcPackage) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  throw new Error('TraceWeave repository root not found (expected docs/ and src/package.json)');
}

/** True when target resolves inside root (prevents path traversal). */
export function isPathInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
