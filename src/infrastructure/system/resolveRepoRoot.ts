import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ResolveProjectLayoutOptions {
  docsDir?: string;
  projectRoot?: string;
  moduleUrl?: string;
}

/**
 * Resolve host project root + docs for adopted / symlinked CLI runs.
 * Prefers explicit paths, then docsDir parent, then process.cwd(), then CLI package root.
 */
export function resolveProjectLayout(
  options: ResolveProjectLayoutOptions = {}
): { projectRoot: string; docsDir: string } {
  const moduleUrl = options.moduleUrl ?? import.meta.url;

  if (options.projectRoot && options.docsDir) {
    return {
      projectRoot: path.resolve(options.projectRoot),
      docsDir: path.resolve(options.docsDir),
    };
  }

  if (options.docsDir) {
    const docsDir = path.resolve(options.docsDir);
    const projectRoot =
      options.projectRoot ??
      (path.basename(docsDir) === 'docs' ? path.dirname(docsDir) : resolveRepoRoot(moduleUrl));
    return { projectRoot: path.resolve(projectRoot), docsDir };
  }

  const cwdDocs = path.join(process.cwd(), 'docs');
  if (fs.existsSync(cwdDocs) && fs.statSync(cwdDocs).isDirectory()) {
    return { projectRoot: process.cwd(), docsDir: cwdDocs };
  }

  const projectRoot = options.projectRoot
    ? path.resolve(options.projectRoot)
    : resolveRepoRoot(moduleUrl);
  return { projectRoot, docsDir: path.join(projectRoot, 'docs') };
}

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
