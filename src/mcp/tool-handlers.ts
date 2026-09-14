import { buildTraceWeaveReport } from '../application/build-report.js';
import { checkDocs } from '../application/check-docs.js';

export const MCP_TOOL_NAMES = [
  'get_traceability_summary',
  'get_stratum_density',
  'get_requirement_status',
  'check_quality_gaps',
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
  ];
}

export interface McpToolHandlerOptions {
  subjectOverride?: string;
}

export function callMcpTool(
  docsDir: string,
  name: string,
  args: Record<string, unknown> = {},
  options: McpToolHandlerOptions = {}
): { isError?: boolean; text: string } {
  const reportOptions = options.subjectOverride
    ? { docsDir, subjectOverride: options.subjectOverride }
    : { docsDir };

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

  throw new Error(`Unknown tool: ${name}`);
}
