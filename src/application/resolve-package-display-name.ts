import fs from 'node:fs';
import path from 'node:path';

/** Resolve npm package `name` from root or clean-root nested manifest. */
export function resolvePackageDisplayName(repoRoot: string): string | undefined {
  const candidates = [
    path.join(repoRoot, 'package.json'),
    path.join(repoRoot, 'src', 'package.json'),
  ];

  for (const pkgPath of candidates) {
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { name?: string };
      const name = pkg.name?.trim();
      if (name) return name;
    } catch {
      // ignore parse errors
    }
  }

  return undefined;
}
