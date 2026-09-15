import fs from 'node:fs';
import { resolveCoverageReportPath } from '../core/coverage/CoverageReportLoader.js';
import { resolveProjectLayout } from '../infrastructure/system/resolveRepoRoot.js';

export type EnsureUnitCoverageResult = 'present' | 'missing';

export function ensureUnitCoverageReport(options: {
  projectRoot?: string;
  docsDir?: string;
  quiet?: boolean;
} = {}): EnsureUnitCoverageResult {
  const { projectRoot } = resolveProjectLayout({
    projectRoot: options.projectRoot,
    docsDir: options.docsDir,
    moduleUrl: import.meta.url,
  });
  const coveragePath = resolveCoverageReportPath(projectRoot);
  if (fs.existsSync(coveragePath)) {
    return 'present';
  }

  if (!options.quiet) {
    console.warn(
      '\x1b[33m⚠ Unit coverage report is missing. Run `npm --prefix src run test:coverage` to generate reports/coverage-summary.json.\x1b[0m\n'
    );
  }
  return 'missing';
}
