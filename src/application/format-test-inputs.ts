import { TestCaseInputAnalyzer } from '../core/analyzer/TestCaseInputAnalyzer.js';
import { InputModifiabilitySummary } from '../core/models/types.js';

export function formatTestInputsOutput(
  summary: InputModifiabilitySummary,
  format: 'text' | 'json' | 'markdown'
): string {
  if (format === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  if (format === 'markdown') {
    const lines: string[] = [
      '# TraceWeave - Test Case Input Modifiability Analysis\n',
      `- **Total Test Cases**: ${summary.totalTestCases}`,
      `- **Modifiable (UI変更可能)**: ${summary.modifiableCount}`,
      `- **Unmodifiable (UI除外)**: ${summary.unmodifiableCount}\n`,
      '| ID | Title | Level / Method | Status | Rule & Classification | Modifiable Fields |',
      '|---|---|---|---|---|---|',
    ];
    for (const item of summary.items) {
      const status = item.isModifiable ? '✔ Modifiable' : '✖ Excluded';
      const fields = item.fields.length > 0 ? item.fields.map(f => `\`${f.name}\``).join(', ') : '-';
      lines.push(
        `| **${item.testCaseId}** | ${item.title} | \`${item.testLevel}/${item.testMethod}\` | **${status}** | ${item.analysisRule}: ${item.reasonDescription} | ${fields} |`
      );
    }
    return lines.join('\n');
  }

  return TestCaseInputAnalyzer.formatText(summary);
}
