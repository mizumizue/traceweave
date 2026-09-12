import { MatrixRow, TraceWeaveReport } from '../../../core/models/types.js';

export interface MatrixFilterOptions {
  searchQuery?: string;
  criticality?: string;
  phase?: string;
  score?: string;
}

export function filterMatrixRows(rows: MatrixRow[], filters: MatrixFilterOptions = {}): MatrixRow[] {
  const query = filters.searchQuery?.toLowerCase().trim() || '';
  return rows.filter(row => {
    const matchesSearch =
      !query ||
      row.requirementId.toLowerCase().includes(query) ||
      row.requirementTitle.toLowerCase().includes(query) ||
      (row.needId && row.needId.toLowerCase().includes(query)) ||
      (row.needTitle && row.needTitle.toLowerCase().includes(query)) ||
      row.specs.some(spec => spec.id.toLowerCase().includes(query) || spec.title.toLowerCase().includes(query)) ||
      row.allTestCases.some(testCase => testCase.id.toLowerCase().includes(query) || testCase.title.toLowerCase().includes(query));
    const matchesCriticality = !filters.criticality || filters.criticality === 'all' || row.criticality === filters.criticality;
    const matchesPhase =
      !filters.phase ||
      filters.phase === 'all' ||
      row.allTestCases.some(testCase => testCase.level === filters.phase);
    const matchesScore =
      !filters.score ||
      filters.score === 'all' ||
      (filters.score === 'satisfied' && row.score >= 80) ||
      (filters.score === 'partial' && row.score >= 50 && row.score < 80) ||
      (filters.score === 'unsatisfied' && row.score < 50);
    return matchesSearch && matchesCriticality && matchesPhase && matchesScore;
  });
}

export function serializeMatrixCsv(rows: MatrixRow[]): string {
  const header = 'Need ID,Requirement ID,Requirement Title,Criticality,Score,Specs,Test Cases\n';
  const body = rows.map(row => {
    const specs = `"${row.specs.map(spec => spec.id).join(';')}"`;
    const tests = `"${row.allTestCases.map(testCase => `${testCase.id}(${testCase.level})`).join(';')}"`;
    return `"${row.needId || ''}","${row.requirementId}","${row.requirementTitle}","${row.criticality}","${row.score}%",${specs},${tests}`;
  });
  return header + body.join('\n');
}

export function serializeMatrixJson(rows: MatrixRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function serializeMatrixMarkdown(rows: MatrixRow[]): string {
  const header = '| Requirement | Criticality | Score | Specs | Tests |\n|---|---|---|---|---|\n';
  const body = rows.map(row => {
    const specs = row.specs.map(spec => `\`${spec.id}\``).join(' ');
    const tests = row.allTestCases.map(testCase => `\`${testCase.id}\``).join(' ');
    return `| **${row.requirementId}**: ${row.requirementTitle} | ${row.criticality} | ${row.score}% | ${specs} | ${tests} |`;
  });
  return header + body.join('\n');
}

export function serializeReportJson(report: TraceWeaveReport): string {
  return JSON.stringify(report, null, 2);
}
