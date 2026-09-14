import { TraceWeaveReport } from '../../core/models/types.js';
import { renderCircularGaugeSvg } from '../../core/visualization/renderCircularGaugeSvg.js';

export class HtmlReporter {
  public static generateHtml(report: TraceWeaveReport): string {
    const overallGauge = renderCircularGaugeSvg({
      value: report.summary.overallSufficiencyScore,
      size: 64,
      label: 'Overall Sufficiency',
    });
    const highGauge = renderCircularGaugeSvg({
      value: report.summary.highCriticalityCoverage,
      size: 64,
      label: 'High Criticality Coverage',
    });

    const matrixRows = report.matrix
      .map(row => {
        const gauge = renderCircularGaugeSvg({ value: row.score, size: 36, showValue: true });
        return `<tr><td>${row.requirementId}</td><td>${row.requirementTitle}</td><td>${gauge}</td><td>${row.score}%</td></tr>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>TraceWeave Report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #0f172a; }
    h1, h2 { margin-bottom: 0.5rem; }
    .gauges { display: flex; gap: 2rem; align-items: center; margin: 1rem 0 2rem; }
    .gauge-card { text-align: center; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #cbd5e1; padding: 0.5rem; vertical-align: middle; }
    th { background: #f1f5f9; text-align: left; }
  </style>
</head>
<body>
  <h1>TraceWeave Quality &amp; Traceability Report</h1>
  <p>Generated at: ${report.generatedAt}</p>
  <div class="gauges">
    <div class="gauge-card">${overallGauge}<div>Overall</div></div>
    <div class="gauge-card">${highGauge}<div>High Criticality</div></div>
  </div>
  <h2>Traceability Matrix</h2>
  <table>
    <thead><tr><th>Requirement</th><th>Title</th><th>Gauge</th><th>Score</th></tr></thead>
    <tbody>${matrixRows}</tbody>
  </table>
</body>
</html>`;
  }
}
