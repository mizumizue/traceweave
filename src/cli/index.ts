#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { checkDocs } from '../application/check-docs.js';
import { buildTraceWeaveReport } from '../application/build-report.js';
import { resolveDocsDir } from '../application/resolve-docs-dir.js';
import { createDashboardServer } from '../application/serve-dashboard.js';
import { filterCatalog, formatCatalogJson, formatCatalogMarkdown } from '../application/format-catalog.js';
import { formatTestInputsOutput } from '../application/format-test-inputs.js';
import { ConsoleReporter } from '../infrastructure/reporters/ConsoleReporter.js';
import { MarkdownReporter } from '../infrastructure/reporters/MarkdownReporter.js';
import { HtmlReporter } from '../infrastructure/reporters/HtmlReporter.js';
import { PortManager } from '../infrastructure/system/PortManager.js';
import { adoptProject, rollbackAdoption, type AdoptionMode } from '../application/adopt-project.js';
import { buildWebDashboard } from '../application/build-web-dashboard.js';

function exitOnError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\x1b[31m✖ Error: ${message}\x1b[0m`);
  process.exit(1);
}

function getReportBuildOptions(docsDir: string): { docsDir: string; subjectOverride?: string } {
  const globalOpts = program.opts<{ subject?: string }>();
  const subjectOverride = globalOpts.subject?.trim();
  return subjectOverride ? { docsDir, subjectOverride } : { docsDir };
}

const program = new Command();

program
  .name('traceweave')
  .description('TraceWeave - V-Model Traceability Matrix & Test Stratum Sufficiency Analyzer')
  .version('0.1.0')
  .option('--subject <name>', 'Override target application display name for reports and dashboard');

// Command: check
program
  .command('check')
  .description('Validate docs schema, links, cycles, and test coverage (CI friendly)')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-s, --strict', 'Fail if any requirement is untested or not fully satisfied', false)
  .action((options) => {
    let docsDir: string;
    try {
      docsDir = resolveDocsDir(options.docs);
    } catch (err) {
      exitOnError(err);
    }
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
  .option('-f, --format <format>', 'Output format (text, json, markdown, html)', 'text')
  .option('-o, --out <file>', 'Output file path (optional)')
  .action((options) => {
    try {
      const docsDir = resolveDocsDir(options.docs);
      const { report } = buildTraceWeaveReport(getReportBuildOptions(docsDir));

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
      } else if (options.format === 'html') {
        const output = HtmlReporter.generateHtml(report);
        if (options.out) {
          fs.writeFileSync(options.out, output, 'utf-8');
          console.log(`HTML report written to ${options.out}`);
        } else {
          console.log(output);
        }
      } else {
        ConsoleReporter.printSummary(report);
      }
    } catch (err) {
      exitOnError(err);
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
    try {
      const docsDir = resolveDocsDir(options.docs);
      const { report } = buildTraceWeaveReport(getReportBuildOptions(docsDir));

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
    } catch (err) {
      exitOnError(err);
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
    try {
      const docsDir = resolveDocsDir(options.docs);
      const { report } = buildTraceWeaveReport(getReportBuildOptions(docsDir));
      if (!report.inputModifiability) {
        throw new Error('Input modifiability summary is missing from report');
      }
      const output = formatTestInputsOutput(
        report.inputModifiability,
        options.format as 'text' | 'json' | 'markdown'
      );

      if (options.out) {
        fs.writeFileSync(options.out, output, 'utf-8');
        console.log(`Input analysis written to ${options.out}`);
      } else {
        console.log(output);
      }
    } catch (err) {
      exitOnError(err);
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
  .option('--status <status>', 'Filter by document status (draft, proposed, accepted, rejected, superseded, deprecated, all)', 'all')
  .option('-q, --query <query>', 'Search keyword in title, id, or content')
  .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
  .option('-o, --out <file>', 'Output file path (optional)')
  .action((options) => {
    try {
      const docsDir = resolveDocsDir(options.docs);
      const { report } = buildTraceWeaveReport(getReportBuildOptions(docsDir));
      if (!report.catalog) {
        throw new Error('Catalog data is missing from report');
      }
      const catalog = report.catalog;
      const filtered = filterCatalog(catalog, {
        kind: options.kind,
        tag: options.tag,
        query: options.query,
        status: options.status,
        requirementClass: options.reqclass,
      });

      if (options.format === 'json') {
        const output = formatCatalogJson(catalog, filtered);
        if (options.out) {
          fs.writeFileSync(options.out, output, 'utf-8');
          console.log(`Catalog JSON written to ${options.out}`);
        } else {
          console.log(output);
        }
      } else if (options.format === 'markdown') {
        const output = formatCatalogMarkdown(catalog, filtered);
        if (options.out) {
          fs.writeFileSync(options.out, output, 'utf-8');
          console.log(`Catalog Markdown written to ${options.out}`);
        } else {
          console.log(output);
        }
      } else {
        ConsoleReporter.printCatalog(catalog, filtered);
      }
    } catch (err) {
      exitOnError(err);
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
    try {
      const docsDir = resolveDocsDir(options.docs);
      const { report } = buildTraceWeaveReport(getReportBuildOptions(docsDir));
      if (!report.catalog) {
        throw new Error('Catalog data is missing from report');
      }
      const catalog = report.catalog;

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
    } catch (err) {
      exitOnError(err);
    }
  });

// Command: build
program
  .command('build')
  .description('Build static web dashboard (Vite bundle + traceability data)')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-o, --out <dir>', 'Output directory', './src/web/dist')
  .action((options) => {
    try {
      const docsDir = resolveDocsDir(options.docs);
      const outDir = buildWebDashboard({ ...getReportBuildOptions(docsDir), outDir: options.out });
      console.log(`\n\x1b[32m✔ TraceWeave static dashboard built successfully in "${outDir}"\x1b[0m\n`);
    } catch (err) {
      exitOnError(err);
    }
  });

// Command: serve
program
  .command('serve')
  .description('Serve interactive web dashboard locally')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-d, --docs <dir>', 'Docs directory path')
  .action(async (options) => {
    let docsDir: string;
    try {
      docsDir = resolveDocsDir(options.docs);
    } catch (err) {
      exitOnError(err);
    }
    const port = parseInt(options.port, 10);

    const reportOptions = getReportBuildOptions(docsDir);

    let distWeb: string;
    try {
      distWeb = buildWebDashboard({
        docsDir,
        skipViteIfPresent: false,
        subjectOverride: reportOptions.subjectOverride,
      });
    } catch (err) {
      exitOnError(err);
    }

    const isAvailable = await PortManager.isPortAvailable(port);
    if (!isAvailable) {
      console.error(`\n\x1b[31m✖ Port ${port} is already in use. Stop the other process or choose --port.\x1b[0m\n`);
      process.exit(1);
    }

    const server = createDashboardServer({
      docsDir,
      distWeb,
      subjectOverride: reportOptions.subjectOverride,
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      console.error(`\n\x1b[31m✖ Server error: ${err.message}\x1b[0m\n`);
      process.exit(1);
    });

    server.listen(port, () => {
      const { report } = buildTraceWeaveReport(reportOptions);
      const subjectName = report.subject.displayName;
      console.log(
        `\n\x1b[32m🚀 TraceWeave Dashboard for ${subjectName} is running at:\x1b[0m \x1b[1mhttp://localhost:${port}/\x1b[0m`
      );
      console.log(`  - API Endpoint: http://localhost:${port}/api/data`);
      console.log(`  - Serving docs from: ${path.resolve(docsDir)}\n`);
    });
  });

// Command: mcp
program
  .command('mcp')
  .description('Start TraceWeave MCP server for Cursor / AI Agent integration')
  .option('-d, --docs <dir>', 'Docs directory path')
  .option('-t, --transport <mode>', 'Transport mode: stdio (default) or http', 'stdio')
  .option('--host <host>', 'HTTP bind host (http transport only)', '127.0.0.1')
  .option('--port <port>', 'HTTP port (http transport only)', '3100')
  .action(async (options) => {
    try {
      const docsDir = resolveDocsDir(options.docs);
      const reportOptions = getReportBuildOptions(docsDir);
      const transport = String(options.transport || 'stdio').toLowerCase();
      if (transport !== 'stdio' && transport !== 'http') {
        throw new Error(`Invalid transport "${options.transport}". Use stdio or http.`);
      }
      const { startMcpServer } = await import('../mcp/server.js');
      await startMcpServer({
        docsDir,
        subjectOverride: reportOptions.subjectOverride,
        transport: transport as 'stdio' | 'http',
        host: String(options.host),
        port: Number.parseInt(String(options.port), 10),
      });
    } catch (err) {
      exitOnError(err);
    }
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
