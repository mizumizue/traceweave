export const MCP_PROMPT_NAMES = [
  'traceability_review',
  'quality_gap_analysis',
  'v_model_authoring',
] as const;

export type McpPromptName = (typeof MCP_PROMPT_NAMES)[number];

export function listMcpPrompts() {
  return [
    {
      name: 'traceability_review',
      description: 'Review traceability for a requirement or the whole project',
      arguments: [
        {
          name: 'requirementId',
          description: 'Optional requirement ID (e.g. REQ-0001). Omit for project-wide review.',
          required: false,
        },
      ],
    },
    {
      name: 'quality_gap_analysis',
      description: 'Analyze documentation quality gaps and untested requirements',
      arguments: [
        {
          name: 'strict',
          description: 'Whether to enforce strict sufficiency checks (true/false)',
          required: false,
        },
      ],
    },
    {
      name: 'v_model_authoring',
      description: 'Guide for authoring NEED, REQ, SPEC, DSN, and TC documents',
      arguments: [
        {
          name: 'documentKind',
          description: 'Target document kind (need, requirement, specification, design, test_case)',
          required: false,
        },
      ],
    },
  ];
}

export function getMcpPrompt(
  name: string,
  args: Record<string, unknown> = {}
): { messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }> } {
  if (name === 'traceability_review') {
    const requirementId = String(args.requirementId || '').trim();
    const scope = requirementId
      ? `requirement ${requirementId}`
      : 'the entire V-Model documentation set';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Review traceability for ${scope} using TraceWeave MCP tools.`,
              'Steps:',
              '1. Call get_traceability_summary for the global picture.',
              requirementId
                ? `2. Call get_requirement_status with requirementId "${requirementId}".`
                : '2. Call get_traceability_matrix to inspect requirement-to-test links.',
              '3. Call check_quality_gaps with strict false, then true if issues remain.',
              '4. Summarize missing specs, tests, and broken links with document IDs.',
            ].join('\n'),
          },
        },
      ],
    };
  }

  if (name === 'quality_gap_analysis') {
    const strict = String(args.strict || 'false').toLowerCase() === 'true';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Perform a TraceWeave quality gap analysis.',
              `Call check_quality_gaps with strict: ${strict}.`,
              'Then call get_stratum_density to assess test pyramid health.',
              'Report passed/failed checks, warnings, gaps, and pyramid anti-patterns with evidence.',
            ].join('\n'),
          },
        },
      ],
    };
  }

  if (name === 'v_model_authoring') {
    const kind = String(args.documentKind || 'requirement').toLowerCase();
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Help author a TraceWeave ${kind} document following the V-Model schema.`,
              'Use MCP resources under traceweave-doc:// to read existing examples.',
              'Respect abstraction fences: NEED (Why), REQ (What), SPEC (Contract), DSN (How), TC (verification).',
              'Propose frontmatter, required headings, and depends_on links before drafting content.',
            ].join('\n'),
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
}
