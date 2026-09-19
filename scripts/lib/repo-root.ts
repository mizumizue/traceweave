import path from 'node:path';

/** Repository root (parent of `scripts/`) when executed via tsx/node with argv[1] set. */
export function resolveRepoRootFromScriptEntry(): string {
  const entry = process.argv[1];
  if (!entry) {
    throw new Error('Cannot resolve repository root: process.argv[1] is missing');
  }
  return path.resolve(path.dirname(path.resolve(entry)), '..');
}
