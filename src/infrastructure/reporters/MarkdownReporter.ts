import { TraceWeaveReport } from '../../core/models/types.js';

export class MarkdownReporter {
  public static generateMarkdown(report: TraceWeaveReport): string {
    const lines: string[] = [];

    const subjectName = report.subject?.displayName || 'unknown-project';
    lines.push(`# TraceWeave 品質レポート — ${subjectName}\n`);
    lines.push(`> Generated at: ${report.generatedAt}\n`);

    lines.push('## 1. Summary\n');
    lines.push('| Metric | Value |');
    lines.push('|---|---|');
    lines.push(`| Total Needs (NEED) | ${report.summary.totalNeeds} |`);
    lines.push(`| Total Requirements (REQ) | ${report.summary.totalRequirements} |`);
    lines.push(`| Functional Requirements (FR) | ${report.summary.functionalRequirementCount} |`);
    lines.push(`| Non-Functional Requirements (NFR) | ${report.summary.nonFunctionalRequirementCount} |`);
    lines.push(`| Total Specifications (SPEC) | ${report.summary.totalSpecifications} |`);
    lines.push(`| Total Test Cases (TC) | ${report.summary.totalTestCases} |`);
    lines.push(`| **Overall Sufficiency Score** | **${report.summary.overallSufficiencyScore}%** |`);
    lines.push(`| **High Criticality Coverage** | **${report.summary.highCriticalityCoverage}%** |\n`);

    lines.push('## 2. Stratum Density (工程地層密度)\n');
    lines.push('| Phase | Tests Count | Coverage Ratio | Density |');
    lines.push('|---|---|---|---|');
    for (const s of report.strata) {
      lines.push(`| ${s.label} | ${s.count} | ${Math.round(s.coverageRatio * 100)}% | \`${s.density}\` |`);
    }
    lines.push('');

    lines.push('## 3. Test Pyramid Health\n');
    lines.push(`- **Status**: \`${report.pyramid.status}\``);
    for (const w of report.pyramid.warnings) {
      lines.push(`- ⚠️ ${w}`);
    }
    for (const s of report.pyramid.suggestions) {
      lines.push(`- 💡 ${s}`);
    }
    lines.push('');

    lines.push('## 4. Traceability Matrix\n');
    lines.push('| Requirement | Class | Criticality | Score | Specifications | Test Cases (Phase / Method) |');
    lines.push('|---|---|---|---|---|---|');
    for (const row of report.matrix) {
      const specsStr = row.specs.map(s => s.id).join(', ') || '-';
      const testsStr = row.allTestCases.map(t => `${t.id} (\`${t.level}\` / \`${t.method}\`)`).join('<br>') || '**Untested**';
      const classStr = row.requirementClass === 'non_functional' ? 'NFR' : row.requirementClass === 'functional' ? 'FR' : '-';
      lines.push(`| **${row.requirementId}**: ${row.requirementTitle} | \`${classStr}\` | \`${row.criticality}\` | ${row.score}% | ${specsStr} | ${testsStr} |`);
    }
    lines.push('');

    return lines.join('\n');
  }
}
