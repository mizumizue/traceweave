import fs from 'node:fs';
import path from 'node:path';
import { DocNode, TestResultsReport, TestCaseExecutionReport } from '../../core/models/types.js';
import { resolveRepoRoot } from '../system/resolveRepoRoot.js';

const PROJECT_ROOT = resolveRepoRoot(import.meta.url);

export class TestReportLoader {
  /**
   * テスト結果レポートファイル（JSON）を読み込む
   */
  public static loadReport(customPath?: string): TestResultsReport | null {
    const candidates = customPath
      ? [path.resolve(customPath)]
      : [
          path.resolve(PROJECT_ROOT, 'reports/test-results.json'),
          path.resolve(process.cwd(), 'reports/test-results.json'),
          path.resolve(process.cwd(), '../reports/test-results.json'),
          path.resolve(process.cwd(), 'src/../reports/test-results.json'),
        ];

    const reportFile = candidates.find(p => fs.existsSync(p));
    if (!reportFile) {
      return null;
    }

    try {
      const raw = fs.readFileSync(reportFile, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && data.results) {
        return data as TestResultsReport;
      }
    } catch {
      // 読み込み失敗時は null を返す
    }
    return null;
  }

  /**
   * DocNode 配列に対してテスト結果レポートを動的マージする
   */
  public static mergeReportIntoNodes(nodes: DocNode[], report: TestResultsReport | null): DocNode[] {
    for (const node of nodes) {
      if (node.kind !== 'test_case') continue;

      const tcReport = report?.results?.[node.id];
      if (tcReport) {
        node.execution_status = tcReport.status;
        node.execution_duration_ms = tcReport.durationMs;
        node.actual_result = tcReport.outputLog || tcReport.errorMessage;
        node.evidence_log = tcReport.outputLog || tcReport.errorStack || tcReport.errorMessage;
      } else {
        node.execution_status = 'pending';
        node.actual_result = undefined;
        node.evidence_log = undefined;
        node.execution_duration_ms = undefined;
      }
    }
    return nodes;
  }
}
