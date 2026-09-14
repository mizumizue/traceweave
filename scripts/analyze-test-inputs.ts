#!/usr/bin/env tsx
import path from 'node:path';
import { DocParser } from '../src/infrastructure/parser/DocParser.js';
import { enrichDocNodes } from '../src/application/enrich-doc-nodes.js';
import { TestCaseInputAnalyzer } from '../src/core/analyzer/TestCaseInputAnalyzer.js';

const docsDir = path.resolve(process.argv[2] || './docs');
const format = process.argv.includes('--json')
  ? 'json'
  : process.argv.includes('--markdown')
  ? 'markdown'
  : 'text';

const parser = new DocParser();
const nodes = enrichDocNodes(parser.parseDirectory(docsDir));
const analyses = TestCaseInputAnalyzer.analyzeAll(nodes);
const summary = TestCaseInputAnalyzer.summarize(analyses);

if (format === 'json') {
  console.log(JSON.stringify(summary, null, 2));
} else if (format === 'markdown') {
  console.log('# TraceWeave - Test Case UI Input Modifiability Analysis\n');
  console.log(`- **Total Test Cases**: ${summary.totalTestCases}`);
  console.log(`- **Modifiable (UI変更可能)**: ${summary.modifiableCount}`);
  console.log(`- **Unmodifiable (UI実行対象外・除外)**: ${summary.unmodifiableCount}\n`);
  console.log('| ID | Title | Level / Method | Status | Rule & Reason | Modifiable Fields |');
  console.log('|---|---|---|---|---|---|');
  for (const item of summary.items) {
    const status = item.isModifiable ? '✔ Modifiable' : '✖ Excluded';
    const fields = item.fields.length > 0 ? item.fields.map(f => `\`${f.name}\``).join(', ') : '-';
    console.log(
      `| **${item.testCaseId}** | ${item.title} | \`${item.testLevel}/${item.testMethod}\` | **${status}** | ${item.analysisRule}: ${item.reasonDescription} | ${fields} |`
    );
  }
} else {
  console.log(TestCaseInputAnalyzer.formatText(summary));
}
