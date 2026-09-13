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
      const header = 'Need ID,Requirement ID,Requirement Title,Criticality,Score,Specs,Test Cases\n';
      const rows = report.matrix.map((r) => {
        const specs = `"${r.specs.map((s) => s.id).join(';')}"`;
        const tests = `"${r.allTestCases.map((t) => `${t.id}(${t.level})`).join(';')}"`;
        return `"${r.needId || ''}","${r.requirementId}","${r.requirementTitle}","${r.criticality}","${r.score}%",${specs},${tests}`;
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
    });

    if (options.format === 'json') {
      const output = JSON.stringify(
        {
          totalCount: catalog.totalCount,
          filteredCount: filtered.length,
          kindCounts: catalog.kindCounts,
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
        `- **Matching**: ${filtered.length}\n`,
        '| Kind | ID | Status | Title | Cross References | Tags |',
        '|---|---|---|---|---|---|',
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
        lines.push(`| \`${item.kind}\` | **${item.id}** | ${item.status} | ${item.title} | ${refsStr} | ${tagsStr} |`);
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
  .description('Build static web dashboard with embedded traceability data')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-o, --out <dir>', 'Output directory', './src/web/dist')
  .action((options) => {
    const docsDir = resolveDocsDir(options.docs);
    const outDir = path.resolve(options.out);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const { report } = buildTraceWeaveReport({ docsDir });
    const dataJson = JSON.stringify(report);
    fs.writeFileSync(path.join(outDir, 'data.json'), dataJson, 'utf-8');

    // Also check if built web assets exist in default web dist or bundle static standalone HTML
    const defaultWebDist = path.resolve(__dirname, '../web/dist');
    const rootWebDist = path.resolve('./src/web/dist');
    const webDistPath = fs.existsSync(path.join(defaultWebDist, 'index.html'))
      ? defaultWebDist
      : rootWebDist;
    const indexPath = path.join(webDistPath, 'index.html');
    if (fs.existsSync(indexPath) && outDir !== webDistPath) {
      fs.cpSync(webDistPath, outDir, { recursive: true });
    }

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

      // Serve static assets from src/web/dist (resolved dynamically)
      const candidateDistDirs = [
        path.resolve(__dirname, '../web/dist'),
        path.resolve('./src/web/dist'),
        path.resolve(__dirname, '../../src/web/dist'),
        path.resolve('./dist/web'),
      ];
      const distWeb = candidateDistDirs.find(d => fs.existsSync(path.join(d, 'index.html'))) || candidateDistDirs[0];
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
        // Fallback: If web dist is not built, return dynamic dashboard HTML
        const { report } = buildTraceWeaveReport({ docsDir });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(generateFallbackHtml(report));
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

function renderSvgGauge(percentage: number, size = 42, strokeWidth = 4): string {
  const clamped = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 80 ? '#2dd4bf' : clamped >= 50 ? '#fbbf24' : '#fb7185';
  const textColor = clamped >= 80 ? 'text-teal-400' : clamped >= 50 ? 'text-amber-400' : 'text-rose-400';
  const fontSize = size >= 50 ? 'text-xs' : 'text-[10px]';

  return `
    <div class="relative inline-flex items-center justify-center shrink-0" style="width: ${size}px; height: ${size}px;" title="充足率: ${Math.round(clamped)}%">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="transform -rotate-90 origin-center">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="rgba(51, 65, 85, 0.45)" stroke-width="${strokeWidth}" fill="none" />
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" />
      </svg>
      <div class="absolute inset-0 flex items-center justify-center font-mono font-bold ${fontSize} ${textColor}">
        ${Math.round(clamped)}<span class="text-[0.65em] opacity-80">%</span>
      </div>
    </div>
  `;
}

function generateFallbackHtml(report: any): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceWeave - Quality & Traceability Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div class="max-w-7xl mx-auto px-6 py-8">
    <header class="flex items-center justify-between pb-6 border-b border-slate-800">
      <div>
        <div class="flex items-center gap-3">
          <span class="text-3xl">🕸️</span>
          <h1 class="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">TraceWeave</h1>
        </div>
        <p class="text-slate-400 text-sm mt-1">V-Model Traceability Matrix & Test Stratum Sufficiency Analyzer</p>
      </div>
      <div class="flex items-center gap-6 bg-slate-900 border border-slate-800 px-5 py-3 rounded-xl">
        <div class="flex items-center gap-3">
          ${renderSvgGauge(report.summary.overallSufficiencyScore, 52, 5)}
          <div>
            <div class="text-xs text-slate-400 font-bold">全体品質充足度</div>
            <div class="text-xl font-black ${report.summary.overallSufficiencyScore >= 80 ? 'text-teal-400' : 'text-amber-400'}">${report.summary.overallSufficiencyScore}%</div>
          </div>
        </div>
        <div class="h-8 w-px bg-slate-800"></div>
        <div class="flex items-center gap-3">
          ${renderSvgGauge(report.summary.highCriticalityCoverage, 52, 5)}
          <div>
            <div class="text-xs text-slate-400 font-bold">重要要件 (High) 充足率</div>
            <div class="text-xl font-black ${report.summary.highCriticalityCoverage >= 80 ? 'text-teal-400' : 'text-amber-400'}">${report.summary.highCriticalityCoverage}%</div>
          </div>
        </div>
      </div>
    </header>

    <!-- Summary Badges -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400">総要求 (NEED)</div>
        <div class="text-2xl font-bold text-slate-200 mt-1">${report.summary.totalNeeds}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400">総要件 (REQ)</div>
        <div class="text-2xl font-bold text-slate-200 mt-1">${report.summary.totalRequirements}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400">詳細仕様 (SPEC)</div>
        <div class="text-2xl font-bold text-slate-200 mt-1">${report.summary.totalSpecifications}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400">テストケース (TC)</div>
        <div class="text-2xl font-bold text-slate-200 mt-1">${report.summary.totalTestCases}</div>
      </div>
    </div>

    <!-- Stratum Density -->
    <section class="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
      <h2 class="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
        <span>🥞</span> 工程地層密度分析 (Stratum Density)
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        ${report.strata.map((s: any) => `
          <div class="p-4 rounded-lg border ${
            s.density === 'heavy' ? 'bg-teal-950/40 border-teal-600/50 text-teal-300' :
            s.density === 'adequate' ? 'bg-blue-950/40 border-blue-600/50 text-blue-300' :
            s.density === 'thin' ? 'bg-amber-950/40 border-amber-600/50 text-amber-300' :
            'bg-rose-950/40 border-rose-600/50 text-rose-300'
          }">
            <div class="flex items-start justify-between">
              <div>
                <div class="text-xs font-semibold opacity-80">${s.label}</div>
                <div class="text-2xl font-black mt-1">${s.count} <span class="text-xs font-normal">件</span></div>
              </div>
              ${renderSvgGauge(Math.round(s.coverageRatio * 100), 40, 4)}
            </div>
            <div class="mt-3 pt-2 border-t border-current/20 text-xs flex justify-between items-center">
              <span>カバー率: ${Math.round(s.coverageRatio * 100)}%</span>
              <span class="font-bold uppercase text-[10px] px-1.5 py-0.5 bg-black/40 rounded">${s.density}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400 flex items-center gap-4">
        <span>ピラミッド診断: <strong class="text-slate-200">${report.pyramid.status}</strong></span>
        ${report.pyramid.warnings.map((w: any) => `<span class="text-amber-400">⚠️ ${w}</span>`).join('')}
      </div>
    </section>

    <!-- Matrix Table -->
    <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 class="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
        <span>📊</span> トレーサビリティマトリクス (Traceability Matrix)
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-800/60 text-slate-400 text-xs uppercase">
            <tr>
              <th class="p-3">要求 / 要件</th>
              <th class="p-3">重要度</th>
              <th class="p-3">品質充足度 (円グラフ)</th>
              <th class="p-3">紐づく詳細仕様 (SPEC)</th>
              <th class="p-3">紐づくテストケース (工程 / 手法)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            ${report.matrix.map((row: any) => `
              <tr class="hover:bg-slate-800/40 transition">
                <td class="p-3">
                  <div class="font-bold text-slate-200">${row.requirementId}</div>
                  <div class="text-xs text-slate-400">${row.requirementTitle}</div>
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded text-xs font-semibold ${
                    row.criticality === 'high' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    row.criticality === 'medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-slate-800 text-slate-300'
                  }">
                    ${row.criticality}
                  </span>
                </td>
                <td class="p-3">
                  <div class="flex items-center gap-3">
                    ${renderSvgGauge(row.score, 36, 3.5)}
                    <span class="font-bold text-xs ${row.score >= 80 ? 'text-teal-400' : row.score >= 50 ? 'text-amber-400' : 'text-rose-400'}">${row.score}%</span>
                  </div>
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-1">
                    ${row.specs.length > 0 ? row.specs.map((s: any) => `
                      <span class="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-300">${s.id}</span>
                    `).join('') : '<span class="text-slate-600 text-xs">なし</span>'}
                  </div>
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-1.5">
                    ${row.allTestCases.length > 0 ? row.allTestCases.map((tc: any) => `
                      <span class="px-2 py-0.5 rounded text-xs border ${
                        tc.level === 'unit' ? 'bg-slate-800 border-slate-700 text-slate-300' :
                        tc.level === 'integration_internal' ? 'bg-blue-950 border-blue-700 text-blue-300' :
                        tc.level === 'integration_external' ? 'bg-indigo-950 border-indigo-700 text-indigo-300' :
                        tc.level === 'system' ? 'bg-purple-950 border-purple-700 text-purple-300' :
                        'bg-teal-950 border-teal-700 text-teal-300'
                      }">
                        <strong>${tc.id}</strong> (${tc.level})
                      </span>
                    `).join('') : '<span class="text-rose-400 font-bold text-xs">未テスト</span>'}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  </div>
</body>
</html>`;
}

program.parse(process.argv);
