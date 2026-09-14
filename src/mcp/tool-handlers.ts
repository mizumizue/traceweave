import { buildTraceWeaveReport } from '../application/build-report.js';
import { checkDocs } from '../application/check-docs.js';
import { filterCatalog, formatCatalogJson } from '../application/format-catalog.js';
import type { DecisionsFilterOptions } from '../core/models/types.js';

export const MCP_TOOL_NAMES = [
  'get_traceability_summary',
  'get_stratum_density',
  'get_requirement_status',
  'check_quality_gaps',
  'get_traceability_matrix',
  'get_catalog',
  'get_decisions',
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

export function listMcpTools() {
  return [
    {
      name: 'get_traceability_summary',
      description: 'Get global summary of requirements, specifications, test cases and sufficiency score',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_stratum_density',
      description: 'Get test stratum density analysis (Unit, ITa, ITb, ST, UAT) and pyramid diagnosis',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_requirement_status',
      description: 'Get traceability and test cases for a specific requirement ID (e.g. REQ-0001)',
      inputSchema: {
        type: 'object',
        properties: {
          requirementId: { type: 'string', description: 'The requirement ID (e.g. REQ-0001)' },
        },
        required: ['requirementId'],
      },
    },
    {
      name: 'check_quality_gaps',
      description: 'List untested requirements, missing integration tests, and documentation quality gaps via checkDocs',
      inputSchema: {
        type: 'object',
        properties: {
          strict: { type: 'boolean', description: 'Whether to enforce strict sufficiency checks' },
        },
      },
    },
    {
      name: 'get_traceability_matrix',
      description: 'Get the full requirement-to-test traceability matrix rows',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_catalog',
      description: 'Get cross-cutting decisions and architecture catalog with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            description:
              'Document kind filter (actor, use_case, requirement, specification, design, decision, quality_assurance, need, test_case, all)',
          },
          reqclass: {
            type: 'string',
            description: 'Requirement class filter (functional, non_functional, all)',
          },
          tag: { type: 'string', description: 'Filter by tag' },
          status: {
            type: 'string',
            description: 'Document status (draft, proposed, accepted, rejected, superseded, deprecated, all)',
          },
          query: { type: 'string', description: 'Search keyword in title, id, or content' },
        },
      },
    },
    {
      name: 'get_decisions',
      description: 'Get architectural decisions (ADR) and design specifications (DSN)',
      inputSchema: { type: 'object', properties: {} },
    },
  ];
}

export interface McpToolHandlerOptions {
  subjectOverride?: string;
}

function buildReportOptions(docsDir: string, subjectOverride?: string) {
  return subjectOverride ? { docsDir, subjectOverride } : { docsDir };
}

export function callMcpTool(
  docsDir: string,
  name: string,
  args: Record<string, unknown> = {},
  options: McpToolHandlerOptions = {}
): { isError?: boolean; text: string } {
  const reportOptions = buildReportOptions(docsDir, options.subjectOverride);

  if (name === 'get_traceability_summary') {
    const { report } = buildTraceWeaveReport(reportOptions);
    return {
      text: JSON.stringify({ subject: report.subject, summary: report.summary }, null, 2),
    };
  }

  if (name === 'get_stratum_density') {
    const { report } = buildTraceWeaveReport(reportOptions);
    return {
      text: JSON.stringify({ strata: report.strata, pyramid: report.pyramid }, null, 2),
    };
  }

  if (name === 'get_requirement_status') {
    const reqId = String(args.requirementId || '');
    const { report } = buildTraceWeaveReport(reportOptions);
    const row = report.matrix.find(r => r.requirementId.toLowerCase() === reqId.toLowerCase());
    const suff = report.requirements.find(r => r.requirementId.toLowerCase() === reqId.toLowerCase());

    if (!row) {
      return {
        isError: true,
        text: JSON.stringify(
          {
            error: 'ERR_REQUIREMENT_NOT_FOUND',
            requirementId: reqId,
            message: `Requirement ${reqId} not found in docs.`,
          },
          null,
          2
        ),
      };
    }

    return { text: JSON.stringify({ matrixRow: row, sufficiency: suff }, null, 2) };
  }

  if (name === 'check_quality_gaps') {
    const strict = Boolean(args.strict);
    const res = checkDocs({ docsDir, strict });
    return {
      text: JSON.stringify(
        {
          passed: res.passed,
          errors: res.errors,
          warnings: res.warnings,
          gaps: res.report?.gaps,
        },
        null,
        2
      ),
    };
  }

  if (name === 'get_traceability_matrix') {
    const { report } = buildTraceWeaveReport(reportOptions);
    return {
      text: JSON.stringify({ matrix: report.matrix }, null, 2),
    };
  }

  if (name === 'get_catalog') {
    const { report } = buildTraceWeaveReport(reportOptions);
    if (!report.catalog) {
      return {
        isError: true,
        text: JSON.stringify({ error: 'ERR_CATALOG_MISSING', message: 'Catalog data is missing from report.' }, null, 2),
      };
    }
    const catalogFilters: DecisionsFilterOptions = {
      kind: (args.kind ? String(args.kind) : 'all') as DecisionsFilterOptions['kind'],
      tag: args.tag ? String(args.tag) : undefined,
      query: args.query ? String(args.query) : undefined,
      status: (args.status ? String(args.status) : 'all') as DecisionsFilterOptions['status'],
      requirementClass: (args.reqclass ? String(args.reqclass) : 'all') as DecisionsFilterOptions['requirementClass'],
    };
    const filtered = filterCatalog(report.catalog, catalogFilters);
    return { text: formatCatalogJson(report.catalog, filtered) };
  }

  if (name === 'get_decisions') {
    const { report } = buildTraceWeaveReport(reportOptions);
    if (!report.catalog) {
      return {
        isError: true,
        text: JSON.stringify({ error: 'ERR_CATALOG_MISSING', message: 'Catalog data is missing from report.' }, null, 2),
      };
    }
    const adrs = report.catalog.items.filter(i => i.kind === 'decision');
    const dsns = report.catalog.items.filter(i => i.kind === 'design');
    return {
      text: JSON.stringify({ adrs, dsns }, null, 2),
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}
