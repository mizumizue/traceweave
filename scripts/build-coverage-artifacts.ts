import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

async function syncWebDashboard(): Promise<void> {
  const distWebJson = path.join(ROOT, 'src', 'web', 'dist', 'data.json');
  if (!fs.existsSync(path.dirname(distWebJson))) return;

  const { buildTraceWeaveReport } = await import('../src/application/build-report.js');
  const { report } = buildTraceWeaveReport({
    docsDir: path.join(ROOT, 'docs'),
    useCache: false,
  });
  fs.writeFileSync(distWebJson, JSON.stringify(report), 'utf-8');
  console.log(`\x1b[32m✔ Synchronized coverage to Web Dashboard data: ${distWebJson}\x1b[0m`);

  const coverageSourceDir = path.join(ROOT, 'reports', 'coverage-files');
  const coverageDistDir = path.join(ROOT, 'src', 'web', 'dist', 'coverage-files');
  if (fs.existsSync(coverageSourceDir)) {
    fs.mkdirSync(coverageDistDir, { recursive: true });
    for (const entry of fs.readdirSync(coverageSourceDir)) {
      if (!entry.endsWith('.json')) continue;
      fs.copyFileSync(path.join(coverageSourceDir, entry), path.join(coverageDistDir, entry));
    }
  }
}

syncWebDashboard()
  .then(() => {
    console.log('');
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
