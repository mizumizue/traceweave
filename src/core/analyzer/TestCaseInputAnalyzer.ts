import { isActiveTestCase } from '../models/docStatus.js';
import {
  DocNode,
  TestCaseInputAnalysis,
  InputModifiabilitySummary,
  InputFieldSchema,
} from '../models/types.js';
import { TestRunnerRegistry } from '../testing/TestRunnerRegistry.js';

export class TestCaseInputAnalyzer {
  /**
   * Deterministically analyzes a single DocNode to classify whether its test inputs
   * can be modified and executed on the UI, producing an objective diagnosis and rule citation.
   */
  public static analyze(node: DocNode): TestCaseInputAnalysis {
    const analyzedAt = new Date().toISOString();

    // Rule 0: Must be a test_case kind
    if (node.kind !== 'test_case') {
      return {
        testCaseId: node.id,
        title: node.title,
        modifiability: 'unmodifiable',
        isModifiable: false,
        classification: 'UI入力変更不可 (非テストケース文書)',
        reasonCode: 'non_test_case',
        reasonDescription: `種別が "${node.kind}" であり、テストケースではないためUI実行・入力変更の対象外です。`,
        analysisRule: 'Rule-0: Non-TestCase Document',
        patternsCount: 0,
        fields: [],
        analyzedAt,
      };
    }

    const testLevel = node.test_level || 'unit';
    const testMethod = node.test_method || 'unit_mock';

    // Rule 1: External Environment / Non-Pure Test Excluded
    // Tests that require external processes, system calls, real file I/O, or browsers are excluded.
    const externalMethods = ['e2e', 'scenario', 'exploratory_manual', 'performance_load', 'security'];
    const externalLevels = ['system', 'acceptance'];
    if (externalMethods.includes(testMethod) || externalLevels.includes(testLevel)) {
      return {
        testCaseId: node.id,
        title: node.title,
        testLevel,
        testMethod,
        modifiability: 'unmodifiable',
        isModifiable: false,
        classification: 'UI入力変更不可 (外部環境依存)',
        reasonCode: 'external_environment_dependency',
        reasonDescription: `検証手法 "${testMethod}"（工程: ${testLevel}）は、ファイルシステム、CLIサブプロセス、またはブラウザ等の外部実行環境を要するため、UI上の単純な入力変更・実行対象から除外されます。`,
        analysisRule: 'Rule-1: External Environment / Non-Pure Test Excluded',
        parameterFilePath: node.parameter_file,
        patternsCount: node.parameters?.patterns?.length || 0,
        fields: [],
        analyzedAt,
      };
    }

    // Rule 2: Missing Parameter Dataset
    // Tests without structured external parameter datasets (only natural language steps in Markdown) cannot be parameterized on the UI.
    const patterns = node.parameters?.patterns || [];
    if (!node.parameter_file || patterns.length === 0) {
      return {
        testCaseId: node.id,
        title: node.title,
        testLevel,
        testMethod,
        modifiability: 'unmodifiable',
        isModifiable: false,
        classification: 'UI入力変更不可 (パラメータ未定義)',
        reasonCode: 'missing_parameter_dataset',
        reasonDescription: '外部パラメータ定義ファイル（JSON）が存在しないか、入力パターンが定義されていません。自然言語の手順（Steps）に基づくテストスイートでのみ検証可能です。',
        analysisRule: 'Rule-2: Missing Parameter Dataset',
        parameterFilePath: node.parameter_file,
        patternsCount: 0,
        fields: [],
        analyzedAt,
      };
    }

    // Rule 3: Pure Test Handler Not Registered
    // Pure calculation handler must be registered in TestRunnerRegistry to safely evaluate in-memory.
    if (!TestRunnerRegistry.has(node.id)) {
      const needsExternalRuntime = testMethod === 'api_contract';
      if (needsExternalRuntime) {
        return {
          testCaseId: node.id,
          title: node.title,
          testLevel,
          testMethod,
          modifiability: 'unmodifiable',
          isModifiable: false,
          classification: 'UI入力変更不可 (外部環境依存)',
          reasonCode: 'external_environment_dependency',
          reasonDescription: `検証手法 "${testMethod}"（工程: ${testLevel}）は、ファイルシステム、CLIサブプロセス、またはブラウザ等の外部実行環境を要するため、UI上の単純な入力変更・実行対象から除外されます。`,
          analysisRule: 'Rule-1: External Environment / Non-Pure Test Excluded',
          parameterFilePath: node.parameter_file,
          patternsCount: patterns.length,
          fields: [],
          analyzedAt,
        };
      }
      return {
        testCaseId: node.id,
        title: node.title,
        testLevel,
        testMethod,
        modifiability: 'unmodifiable',
        isModifiable: false,
        classification: 'UI入力変更不可 (純粋ハンドラ未登録)',
        reasonCode: 'no_pure_handler',
        reasonDescription: '単純な入出力のみで決定論的に実行できる純粋関数ハンドラが未登録です。無理なダミーモックは行わず除外します。',
        analysisRule: 'Rule-3: Pure Test Handler Not Registered',
        parameterFilePath: node.parameter_file,
        patternsCount: patterns.length,
        fields: [],
        analyzedAt,
      };
    }

    // Rule 4: Pure Function with Parameterized Inputs Qualified
    // Extract input fields schema from the first pattern
    const fields: InputFieldSchema[] = [];
    if (patterns[0]?.inputs && typeof patterns[0].inputs === 'object') {
      for (const [key, value] of Object.entries(patterns[0].inputs)) {
        fields.push({
          name: key,
          type: Array.isArray(value) ? 'array' : typeof value,
          sampleValue: value,
        });
      }
    }

    return {
      testCaseId: node.id,
      title: node.title,
      testLevel,
      testMethod,
      modifiability: 'modifiable',
      isModifiable: true,
      classification: 'UI入力変更可能 (純粋入出力)',
      reasonDescription: '外部環境への副作用がなく、パラメータ化された入力値から決定論的に実測値を算出できる純粋テストロジックです。UI上での対話的入力変更と即時実行に対応しています。',
      analysisRule: 'Rule-4: Pure Function with Parameterized Inputs Qualified',
      parameterFilePath: node.parameter_file,
      patternsCount: patterns.length,
      fields,
      analyzedAt,
    };
  }

  /**
   * Analyzes all test cases in the given list of DocNodes.
   */
  public static analyzeAll(nodes: DocNode[]): TestCaseInputAnalysis[] {
    return nodes.filter(isActiveTestCase).map(n => this.analyze(n));
  }

  /**
   * Produces a summary of modifiability across all analyzed test cases.
   */
  public static summarize(analyses: TestCaseInputAnalysis[]): InputModifiabilitySummary {
    const modifiableCount = analyses.filter(a => a.isModifiable).length;
    return {
      totalTestCases: analyses.length,
      modifiableCount,
      unmodifiableCount: analyses.length - modifiableCount,
      items: analyses,
    };
  }

  /**
   * Formats the analysis results into a structured human-readable text table.
   */
  public static formatText(summary: InputModifiabilitySummary): string {
    const lines: string[] = [];
    lines.push('================================================================================');
    lines.push(' TraceWeave - テストケースUI入力値変更可否 スクリプト静的解析レポート');
    lines.push('================================================================================');
    lines.push(`総テストケース数: ${summary.totalTestCases} 件`);
    lines.push(`  ✔ UI入力値変更可能 : ${summary.modifiableCount} 件`);
    lines.push(`  ✖ UI入力値変更不可 (除外): ${summary.unmodifiableCount} 件`);
    lines.push('--------------------------------------------------------------------------------');
    lines.push('ID       | 変更可否     | 工程/手法             | 適用ルール & 理由');
    lines.push('---------|--------------|-----------------------|---------------------------------------');

    for (const item of summary.items) {
      const statusStr = item.isModifiable ? '\x1b[32m変更可能\x1b[0m      ' : '\x1b[31m変更不可(除外)\x1b[0m';
      const levelMethod = `${item.testLevel || '-'}/${item.testMethod || '-'}`.padEnd(21);
      const rule = `${item.analysisRule.split(':')[0]} (${item.classification})`;
      lines.push(`${item.testCaseId.padEnd(8)} | ${statusStr} | ${levelMethod} | ${rule}`);
      lines.push(`         | 理由: ${item.reasonDescription}`);
      if (item.fields.length > 0) {
        lines.push(`         | 変更可能フィールド: [${item.fields.map(f => `${f.name}:${f.type}`).join(', ')}]`);
      }
      lines.push('---------|--------------|-----------------------|---------------------------------------');
    }

    return lines.join('\n');
  }
}
