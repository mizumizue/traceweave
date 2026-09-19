import fs from 'node:fs';
import path from 'node:path';

const CONFIG_REL = path.join('.traceweave', 'config.json');

export function workspaceConfigPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, CONFIG_REL);
}

/**
 * Walk upward from startDir until `.traceweave/config.json` exists.
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  const fsRoot = path.parse(dir).root;

  while (dir !== fsRoot) {
    const configPath = workspaceConfigPath(dir);
    if (fs.existsSync(configPath) && fs.statSync(configPath).isFile()) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  return null;
}

/**
 * Workspace root for TraceWeave commands: explicit env/option, then marker walk, then docs parent.
 */
export function resolveWorkspaceRoot(options: {
  workspaceRoot?: string;
  startDir?: string;
} = {}): string {
  if (options.workspaceRoot) {
    const root = path.resolve(options.workspaceRoot);
    if (!fs.existsSync(workspaceConfigPath(root))) {
      throw new Error(
        `Workspace config not found at ${workspaceConfigPath(root)}. Create .traceweave/config.json or omit --workspace.`
      );
    }
    return root;
  }

  const envRoot = process.env.TRACEWEAVE_WORKSPACE?.trim();
  if (envRoot) {
    const root = path.resolve(envRoot);
    if (!fs.existsSync(workspaceConfigPath(root))) {
      throw new Error(`TRACEWEAVE_WORKSPACE is set but ${workspaceConfigPath(root)} does not exist.`);
    }
    return root;
  }

  const fromWalk = findWorkspaceRoot(options.startDir ?? process.cwd());
  if (fromWalk) return fromWalk;

  const cwd = path.resolve(options.startDir ?? process.cwd());
  const cwdDocs = path.join(cwd, 'docs');
  if (fs.existsSync(cwdDocs) && fs.statSync(cwdDocs).isDirectory()) {
    return cwd;
  }

  let dir = cwd;
  const fsRoot = path.parse(dir).root;
  while (dir !== fsRoot) {
    const docs = path.join(dir, 'docs');
    if (fs.existsSync(docs) && fs.statSync(docs).isDirectory()) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  throw new Error(
    'TraceWeave workspace not found. Add .traceweave/config.json or run from a directory containing docs/.'
  );
}
