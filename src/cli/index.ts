#!/usr/bin/env node
import { Command } from 'commander';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDocs } from '../application/check-docs.js';
import { buildTraceWeaveReport } from '../application/build-report.js';
import { ConsoleReporter } from '../infrastructure/reporters/ConsoleReporter.js';
import { MarkdownReporter } from '../infrastructure/reporters/MarkdownReporter.js';
import { TestRunnerRegistry } from '../core/testing/TestRunnerRegistry.js';
import { TestCaseInputAnalyzer } from '../core/analyzer/TestCaseInputAnalyzer.js';
import { DecisionsCatalogBuilder } from '../core/decisions/DecisionsCatalogBuilder.js';
import { PortManager } from '../infrastructure/system/PortManager.js';
import { adoptProject, rollbackAdoption, type AdoptionMode } from '../application/adopt-project.js';
import {
  buildWebDashboard,
  ensureWebDashboardBuilt,
} from '../application/build-web-dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDocsDir(requestedPath?: string): string {
  if (requestedPath) {
    const resolved = path.resolve(requestedPath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error(`Docs directory not found: ${resolved}`);
    }
    return resolved;
  }
  const candidateDirs = [
    path.resolve(__dirname, '../../docs'),
    path.resolve(__dirname, '../docs'),
    path.resolve(process.cwd(), requestedPath || './docs'),
    path.resolve(process.cwd(), '../docs'),
  ];
  const resolved = candidateDirs.find(d => fs.existsSync(d) && fs.statSync(d).isDirectory());
  if (!resolved) {
    throw new Error('Docs directory not found');
  }
  return resolved;
}

const program = new Command();

program
  .name('traceweave')
  .description('TraceWeave - V-Model Traceability Matrix & Test Stratum Sufficiency Analyzer')
  .version('0.1.0');

// Command: check
program
  .command('check')
  .description('Validate docs schema, links, cycles, and test coverage (CI friendly)')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-s, --strict', 'Fail if any requirement is untested or not fully satisfied', false)
  .action((options) => {
    const docsDir = resolveDocsDir(options.docs);
    console.log(`\n🔍 Checking docs in "${docsDir}"...`);
    const result = checkDocs({
      docsDir,
      strict: options.strict,
    });

    if (result.warnings.length > 0) {
      console.log(`\n\x1b[33mWarnings (${result.warnings.length}):\x1b[0m`);
      for (const w of result.warnings) {
        console.log(`  \x1b[33m- ${w}\x1b[0m`);
      }
    }

    if (!result.passed) {
      console.error(`\n\x1b[31mFAIL: ${result.errors.length} error(s) found:\x1b[0m`);
      for (const err of result.errors) {
        console.error(`  \x1b[31m- ${err}\x1b[0m`);
      }
      process.exit(1);
    } else {
      console.log(`\n\x1b[32m✔ PASS: Traceability and documentation checks passed successfully!\x1b[0m\n`);
      process.exit(0);
    }
  });

// Command: report
program
  .command('report')
  .description('Generate quality sufficiency and phase stratum report')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
  .option('-o, --out <file>', 'Output file path (optional)')
  .action((options) => {
    const docsDir = resolveDocsDir(options.docs);
    const { report } = buildTraceWeaveReport({ docsDir });

    if (options.format === 'json') {
      const output = JSON.stringify(report, null, 2);
      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`Report written to ${options.out}`);
      } else {
        console.log(output);
      }
    } else if (options.format === 'markdown') {
      const output = MarkdownReporter.generateMarkdown(report);
      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`Markdown report written to ${options.out}`);
      } else {
        console.log(output);
      }
    } else {
      ConsoleReporter.printSummary(report);
    }
  });

// Command: matrix
program
  .command('matrix')
  .description('Display or export requirement-to-test traceability matrix')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-f, --format <format>', 'Output format (text, json, markdown, csv)', 'text')
  .option('-o, --out <file>', 'Output file path (optional)')
  .action((options) => {
    const docsDir = resolveDocsDir(options.docs);
    const { report } = buildTraceWeaveReport({ docsDir });

    if (options.format === 'json') {
      const output = JSON.stringify(report.matrix, null, 2);
      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`Matrix written to ${options.out}`);
      } else {
        console.log(output);
      }
    } else if (options.format === 'csv') {
      const header = 'Need ID,Requirement ID,Requirement Title,Class,Criticality,Score,Specs,Test Cases\n';
      const rows = report.matrix.map((r) => {
        const specs = `"${r.specs.map((s) => s.id).join(';')}"`;
        const tests = `"${r.allTestCases.map((t) => `${t.id}(${t.level})`).join(';')}"`;
        return `"${r.needId || ''}","${r.requirementId}","${r.requirementTitle}","${r.requirementClass || ''}","${r.criticality}","${r.score}%",${specs},${tests}`;
      });
      const output = header + rows.join('\n');
      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`CSV matrix written to ${options.out}`);
      } else {
        console.log(output);
      }
    } else if (options.format === 'markdown') {
      const output = MarkdownReporter.generateMarkdown(report);
      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`Markdown written to ${options.out}`);
      } else {
        console.log(output);
      }
    } else {
      ConsoleReporter.printMatrixText(report);
    }
  });

// Command: test-inputs
program
  .command('test-inputs')
  .alias('inputs')
  .description('Deterministically analyze test case input modifiability and classify UI executability via script')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
  .option('-o, --out <file>', 'Output file path (optional)')
  .action((options) => {
    const docsDir = resolveDocsDir(options.docs);
    const { nodes } = buildTraceWeaveReport({ docsDir });
    const analyses = TestCaseInputAnalyzer.analyzeAll(nodes);
    const summary = TestCaseInputAnalyzer.summarize(analyses);

    let output = '';
    if (options.format === 'json') {
      output = JSON.stringify(summary, null, 2);
    } else if (options.format === 'markdown') {
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
      output = lines.join('\n');
    } else {
      output = TestCaseInputAnalyzer.formatText(summary);
    }

    if (options.out) {
      fs.writeFileSync(options.out, output, 'utf-8');
      console.log(`Input analysis written to ${options.out}`);
    } else {
      console.log(output);
    }
  });

// Command: catalog
program
  .command('catalog')
  .description('Display or export cross-cutting decisions & architecture documents catalog')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-k, --kind <kind>', 'Filter by document kind (actor, use_case, requirement, specification, design, decision, quality_assurance, need, test_case, all)', 'all')
  .option('--reqclass <class>', 'Filter requirements by class (functional, non_functional, all)', 'all')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-q, --query <query>', 'Search keyword in title, id, or content')
  .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
  .option('-o, --out <file>', 'Output file path (optional)')
  .action((options) => {
    const docsDir = resolveDocsDir(options.docs);
    const { report } = buildTraceWeaveReport({ docsDir });
    const catalog = report.catalog || DecisionsCatalogBuilder.build(report.nodes || []);
    const filtered = DecisionsCatalogBuilder.filter(catalog, {
      kind: options.kind,
      tag: options.tag,
      query: options.query,
      requirementClass: options.reqclass,
    });

    if (options.format === 'json') {
      const output = JSON.stringify(
        {
          totalCount: catalog.totalCount,
          filteredCount: filtered.length,
          kindCounts: catalog.kindCounts,
          requirementClassCounts: catalog.requirementClassCounts,
          items: filtered,
        },
        null,
        2
      );
      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`Catalog JSON written to ${options.out}`);
      } else {
        console.log(output);
      }
    } else if (options.format === 'markdown') {
      const lines: string[] = [
        '# TraceWeave - Decisions & Architecture Catalog\n',
        `- **Total Registered**: ${catalog.totalCount}`,
        `- **Matching**: ${filtered.length}`,
        `- **Requirement class**: FR ${catalog.requirementClassCounts.functional} / NFR ${catalog.requirementClassCounts.non_functional}\n`,
        '| Kind | ID | Class | Status | Title | Cross References | Tags |',
        '|---|---|---|---|---|---|---|',
      ];
      for (const item of filtered) {
        const refs: string[] = [];
        if (item.relatedActors?.length) refs.push(`ACT:${item.relatedActors.map(a => a.id).join(',')}`);
        if (item.relatedUseCases?.length) refs.push(`UC:${item.relatedUseCases.map(u => u.id).join(',')}`);
        if (item.relatedDecisions?.length) refs.push(`ADR:${item.relatedDecisions.map(d => d.id).join(',')}`);
        if (item.relatedDesigns?.length) refs.push(`DSN:${item.relatedDesigns.map(d => d.id).join(',')}`);
        if (item.relatedReqs?.length) refs.push(`REQ:${item.relatedReqs.map(r => r.id).join(',')}`);
        if (item.relatedSpecs?.length) refs.push(`SPEC:${item.relatedSpecs.map(s => s.id).join(',')}`);
        const refsStr = refs.join('; ') || '-';
        const tagsStr = item.tags.length > 0 ? item.tags.map(t => `\`${t}\``).join(' ') : '-';
        const classStr =
          item.kind === 'requirement'
            ? item.requirement_class === 'non_functional'
              ? 'NFR'
              : item.requirement_class === 'functional'
                ? 'FR'
                : '-'
            : '-';
        lines.push(`| \`${item.kind}\` | **${item.id}** | ${classStr} | ${item.status} | ${item.title} | ${refsStr} | ${tagsStr} |`);
      }
      const output = lines.join('\n');
      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`Catalog Markdown written to ${options.out}`);
      } else {
        console.log(output);
      }
    } else {
      ConsoleReporter.printCatalog(catalog, filtered);
    }
  });

// Command: decisions
program
  .command('decisions')
  .description('Display architectural decisions (ADR) and design specifications (DSN)')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-f, --format <format>', 'Output format (text, json)', 'text')
  .option('-o, --out <file>', 'Output file path (optional)')
  .action((options) => {
    const docsDir = resolveDocsDir(options.docs);
    const { report } = buildTraceWeaveReport({ docsDir });
    const catalog = report.catalog || DecisionsCatalogBuilder.build(report.nodes || []);

    if (options.format === 'json') {
      const adrs = catalog.items.filter(i => i.kind === 'decision');
      const dsns = catalog.items.filter(i => i.kind === 'design');
      const output = JSON.stringify({ adrs, dsns }, null, 2);
      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`Decisions JSON written to ${options.out}`);
      } else {
        console.log(output);
      }
    } else {
      ConsoleReporter.printDecisions(catalog);
    }
  });

// Command: build
program
  .command('build')
  .description('Build static web dashboard (Vite bundle + traceability data)')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-o, --out <dir>', 'Output directory', './src/web/dist')
  .action((options) => {
    const docsDir = resolveDocsDir(options.docs);
    const outDir = buildWebDashboard({ docsDir, outDir: options.out });
    console.log(`\n\x1b[32m✔ TraceWeave static dashboard built successfully in "${outDir}"\x1b[0m\n`);
  });

// Command: serve
program
  .command('serve')
  .description('Serve interactive web dashboard locally')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-d, --docs <dir>', 'Docs directory path')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const docsDir = resolveDocsDir(options.docs);

    const distWeb = ensureWebDashboardBuilt(docsDir);

    // Free port if already occupied by a previous process
    const isAvailable = await PortManager.isPortAvailable(port);
    if (!isAvailable) {
      console.log(`\n\x1b[33m⚡ Port ${port} is already in use. Terminating previous process...\x1b[0m`);
      const result = await PortManager.ensurePortFree(port);
      if (result.killedPids.length > 0) {
        console.log(`\x1b[32m✔ Terminated previous process (PID: ${result.killedPids.join(', ')}). Port ${port} is now free.\x1b[0m`);
      } else if (!result.freed) {
        console.error(`\x1b[31m✖ Failed to free port ${port}: ${result.error}\x1b[0m`);
      }
    }

    const server = http.createServer((req, res) => {
      // CORS & Cache-Control headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url?.split('?')[0] || '/';

      if (url === '/api/data') {
        try {
          const { report } = buildTraceWeaveReport({ docsDir });
          res.writeHead(200, {
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify(report));
        } catch (e: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      if (url === '/api/test/run' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            if (!TestRunnerRegistry.isExecutable(payload.testCaseId)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: `テストケース "${payload.testCaseId}" はUI実行に対応していません（単純な入出力のみで実行できないテストのため除外）。`,
                  status: 'error',
                })
              );
              return;
            }
            const result = TestRunnerRegistry.runTest({
              testCaseId: payload.testCaseId,
              inputs: payload.inputs || {},
              expected: payload.expected,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (e: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message, status: 'error' }));
          }
        });
        return;
      }

      let targetFile = path.join(distWeb, url === '/' ? 'index.html' : url);

      if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
        const ext = path.extname(targetFile);
        const mimeTypes: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(targetFile).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n\x1b[31m✖ Error: Port ${port} is still in use.\x1b[0m\n`);
      } else {
        console.error(`\n\x1b[31m✖ Server error: ${err.message}\x1b[0m\n`);
      }
      process.exit(1);
    });

    server.listen(port, () => {
      console.log(`\n\x1b[32m🚀 TraceWeave Dashboard is running at:\x1b[0m \x1b[1mhttp://localhost:${port}/\x1b[0m`);
      console.log(`  - API Endpoint: http://localhost:${port}/api/data`);
      console.log(`  - Serving docs from: ${path.resolve(docsDir)}\n`);
    });
  });

// Command: mcp
program
  .command('mcp')
  .description('Start TraceWeave MCP server for Cursor / AI Agent integration')
  .option('-d, --docs <dir>', 'Docs directory path')
  .action(async (options) => {
    const docsDir = resolveDocsDir(options.docs);
    const { startMcpServer } = await import('../mcp/server.js');
    await startMcpServer(docsDir);
  });

// Command: adopt
program
  .command('adopt [targetDir]')
  .description('Adopt TraceWeave into an existing or new project (supports overlay and restructure modes with backup)')
  .option('-m, --mode <mode>', 'Adoption mode: "overlay" (non-destructive temporary setup) or "restructure" (full clean-root migration)', 'overlay')
  .option('-b, --backup-dir <dir>', 'Custom backup directory path')
  .option('--no-backup', 'Skip backup before adopting (not recommended)')
  .option('-d, --dry-run', 'Simulate adoption steps without making changes', false)
  .option('-r, --rollback <backupDir>', 'Rollback changes using a previous backup directory or manifest')
  .option('-p, --project-name <name>', 'Project name for generated documents')
  .option('-f, --force', 'Force restructuring even if git working tree has uncommitted changes', false)
  .action((targetDir, options) => {
    if (options.rollback) {
      try {
        rollbackAdoption(options.rollback);
        process.exit(0);
      } catch (err: any) {
        console.error(`\x1b[31mRollback failed: ${err.message}\x1b[0m`);
        process.exit(1);
      }
    }

    try {
      adoptProject({
        targetDir,
        mode: options.mode as AdoptionMode,
        backupDir: options.backupDir,
        noBackup: options.backup === false,
        dryRun: options.dryRun,
        projectName: options.projectName,
        force: options.force,
      });
      process.exit(0);
    } catch (err: any) {
      console.error(`\x1b[31mAdoption failed: ${err.message}\x1b[0m`);
      process.exit(1);
    }
  });

program.parse(process.argv);
