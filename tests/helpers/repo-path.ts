import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.resolve(testsDirectory, '..', '..');

export function repositoryPath(...parts: string[]): string {
  return path.join(repositoryRoot, ...parts);
}
