import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_DIR = path.dirname(fileURLToPath(import.meta.url));

export function resolveDocsDir(requestedPath?: string): string {
  if (requestedPath) {
    const resolved = path.resolve(requestedPath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error(`Docs directory not found: ${resolved}`);
    }
    return resolved;
  }

  const candidateDirs = [
    path.resolve(process.cwd(), './docs'),
    path.resolve(process.cwd(), '../docs'),
    path.resolve(CLI_DIR, '../../docs'),
    path.resolve(CLI_DIR, '../docs'),
  ];
  const resolved = candidateDirs.find(d => fs.existsSync(d) && fs.statSync(d).isDirectory());
  if (!resolved) {
    throw new Error('Docs directory not found');
  }
  return resolved;
}
