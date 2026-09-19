import fs from 'node:fs';
import path from 'node:path';
import { TestResultsReport } from '../../core/models/types.js';

export function loadTestResultsReportFile(reportPath: string): TestResultsReport | null {
  if (!fs.existsSync(reportPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    if (raw && typeof raw === 'object' && raw.results) {
      return raw as TestResultsReport;
    }
  } catch {
    return null;
  }
  return null;
}

export function writeTestResultsReportFile(reportPath: string, report: TestResultsReport): void {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
}
