import fs from 'node:fs';
import path from 'node:path';
import { resolveCoverageFilesDir } from '../core/coverage/CoverageDetailBuilder.js';
import { buildTraceWeaveReport } from './build-report.js';

export interface SyncDashboardArtifactsOptions {
  projectRoot: string;
  docsDir: string;
  webDistDir?: string;
  testReportPath?: string;
  subjectOverride?: string;
}

/** Refresh web/dist/data.json and copy coverage-files when the dashboard dist exists. */
export function syncDashboardArtifacts(options: SyncDashboardArtifactsOptions): void {
  const distDir = options.webDistDir ?? path.join(options.projectRoot, 'src', 'web', 'dist');
  if (!fs.existsSync(path.dirname(path.join(distDir, 'data.json')))) {
    return;
  }

  const { report } = buildTraceWeaveReport({
    docsDir: options.docsDir,
    useCache: false,
    ...(options.testReportPath ? { testReportPath: options.testReportPath } : {}),
    ...(options.subjectOverride ? { subjectOverride: options.subjectOverride } : {}),
  });

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'data.json'), JSON.stringify(report), 'utf-8');

  const coverageSourceDir = resolveCoverageFilesDir(options.projectRoot);
  const coverageDistDir = path.join(distDir, 'coverage-files');
  if (!fs.existsSync(coverageSourceDir)) {
    return;
  }

  fs.mkdirSync(coverageDistDir, { recursive: true });
  for (const entry of fs.readdirSync(coverageSourceDir)) {
    if (!entry.endsWith('.json')) continue;
    fs.copyFileSync(path.join(coverageSourceDir, entry), path.join(coverageDistDir, entry));
  }
}
