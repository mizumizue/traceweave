import path from 'node:path';
import { DocNode, TestResultsReport } from '../../core/models/types.js';
import { loadWorkspaceConfig } from '../workspace/loadWorkspaceConfig.js';
import { resolveWorkspaceRoot } from '../workspace/resolveWorkspaceRoot.js';
import { loadTestResultsReportFile } from './loadTestResultsReport.js';

export class TestReportLoader {
  /**
   * テスト結果レポートファイル（JSON）を読み込む
   */
  public static loadReport(customPath?: string): TestResultsReport | null {
    if (customPath) {
      return loadTestResultsReportFile(path.resolve(customPath));
    }

    try {
      const workspaceRoot = resolveWorkspaceRoot({ startDir: process.cwd() });
      const workspace = loadWorkspaceConfig(workspaceRoot);
      return loadTestResultsReportFile(workspace.testResultsAggregatePath);
    } catch {
      return null;
    }
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
