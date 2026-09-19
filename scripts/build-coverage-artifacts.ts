import fs from 'node:fs';
import path from 'node:path';
import {
  buildAllCoverageFileDetails,
  writeCoverageFileArtifacts,
} from '../src/core/coverage/CoverageDetailBuilder.js';
import { resolveCoverageReportPath } from '../src/core/coverage/CoverageReportLoader.js';
import {
  buildCoverageSummaryFromLcov,
  loadLcovRecords,
  resolveLcovReportPath,
} from '../src/core/coverage/LcovParser.js';
import { syncDashboardArtifacts } from '../src/application/sync-dashboard-artifacts.js';
import { resolveRepoRootFromScriptEntry } from './lib/repo-root.js';

const ROOT = resolveRepoRootFromScriptEntry();
const lcovPath = resolveLcovReportPath(ROOT);
const summaryPath = resolveCoverageReportPath(ROOT);
const sourceRoot = path.join(ROOT, 'src');

const records = loadLcovRecords(lcovPath);
if (!records) {
  console.error(`\x1b[31m✘ LCOV report not found or empty: ${lcovPath}\x1b[0m`);
  console.error('  Run `npm --prefix src run test:coverage` to generate coverage.\n');
  process.exit(1);
}

const summary = buildCoverageSummaryFromLcov(records);
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
console.log(
  `\x1b[32m✔ Coverage summary generated at: ${summaryPath} (funcs ${Math.round(summary.summary.functionCoverage * 100)}%, branches ${Math.round(summary.summary.branchCoverage * 100)}%)\x1b[0m`
);

const fileDetails = buildAllCoverageFileDetails(records, sourceRoot);
writeCoverageFileArtifacts(ROOT, fileDetails);
console.log(
  `\x1b[32m✔ Coverage file details generated: ${fileDetails.length} file(s) in reports/coverage-files/\x1b[0m`
);

const distWebJson = path.join(ROOT, 'src', 'web', 'dist', 'data.json');
if (fs.existsSync(path.dirname(distWebJson))) {
  syncDashboardArtifacts({
    projectRoot: ROOT,
    docsDir: path.join(ROOT, 'docs'),
  });
  console.log(`\x1b[32m✔ Synchronized coverage to Web Dashboard data: ${distWebJson}\x1b[0m`);
}

console.log('');
