import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { resolveRepoRoot } from '../system/resolveRepoRoot.js';

const DEFAULT_DOCS_DIR = path.join(resolveRepoRoot(import.meta.url), 'docs');

const KINDS: Record<string, { kind: string; prefix: string }> = {
  needs: { kind: 'need', prefix: 'NEED' },
  actors: { kind: 'actor', prefix: 'ACT' },
  usecases: { kind: 'use_case', prefix: 'UC' },
  glossary: { kind: 'glossary', prefix: 'GLO' },
  requirements: { kind: 'requirement', prefix: 'REQ' },
  specifications: { kind: 'specification', prefix: 'SPEC' },
  design: { kind: 'design', prefix: 'DSN' },
  decisions: { kind: 'decision', prefix: 'ADR' },
  quality: { kind: 'quality_assurance', prefix: 'QA' },
  'test-cases': { kind: 'test_case', prefix: 'TC' },
};

function isRetiredDocStatus(status: unknown): boolean {
  return status === 'deprecated' || status === 'superseded';
}

const HEADINGS: Record<string, string[]> = {
  need: ['### Background', '### Problem', '### Desired Outcome'],
  actor: ['### Role', '### Responsibilities', '### Interactions'],
  use_case: [
    '### Goal',
    '### Trigger',
    '### Preconditions',
    '### Main Flow',
    '### Alternative Flows',
    '### Postconditions',
  ],
  glossary: ['### Definition', '### Context', '### Synonyms', '### Related Terms'],
  requirement: ['### Statement', '### Acceptance Criteria'],
  specification: [
    '### Contract',
    '### Inputs',
    '### Outputs',
    '### Errors',
    '### Constraints',
  ],
  design: ['### Decision', '### Structure', '### Data Flow', '### Trade-offs'],
  decision: ['### Context', '### Decision', '### Consequences'],
  quality_assurance: [
    '### Objective',
    '### Quality Criteria',
    '### Verification',
    '### Evidence',
    '### Exit Criteria',
  ],
  test_case: [
    '### Objective',
    '### Preconditions',
    '### Steps',
    '### Expected Results',
  ],
};

const VALID_TEST_LEVELS = [
  'unit',
  'integration_internal',
  'integration_external',
  'system',
  'acceptance',
];

const VALID_TEST_METHODS = [
  'unit_mock',
  'unit_contract',
  'property_based',
  'api_contract',
  'scenario',
  'e2e',
  'performance_load',
  'security',
  'exploratory_manual',
];

export interface DocItem {
  filePath: string;
  meta: Record<string, any>;
  body: string;
}

const DOC_ID_BACKTICK = /`(NEED|REQ|SPEC|DSN|ADR|QA|TC|ACT|UC|GLO)-\d{4,}`/;

const NEED_ALLOWED_SCHEMA_TOKENS = new Set([
  'depends_on',
  'verifies',
  'actor_refs',
  'requirement_refs',
  'links',
]);

const CLI_SUBCOMMAND_BACKTICK =
  /`(?:check|matrix|report|build|serve|catalog|decisions|mcp|adopt|test-inputs|inputs)`/;

function extractContentBody(body: string): string {
  const parts = body.split(/^## Content\s*$/m);
  return parts.length < 2 ? body : parts.slice(1).join('## Content');
}

function findBacktickImplementationLeaks(text: string): string[] {
  const leaks: string[] = [];
  const backtickMatches = text.match(/`[^`]+`/g) ?? [];

  for (const match of backtickMatches) {
    if (DOC_ID_BACKTICK.test(match)) continue;
    const inner = match.slice(1, -1);
    if (NEED_ALLOWED_SCHEMA_TOKENS.has(inner)) continue;
    if (/^[a-z][a-z0-9-]*$/.test(inner) || /^[A-Z][a-zA-Z0-9]*$/.test(inner)) {
      leaks.push(match);
    }
  }

  return [...new Set(leaks)];
}

function findNeedImplementationLeaks(body: string): string[] {
  return findBacktickImplementationLeaks(extractContentBody(body));
}

function findRequirementFenceLeaks(body: string, requirementClass: string | undefined): string[] {
  const leaks: string[] = [];
  const content = extractContentBody(body);
  const statementMatch = content.match(/^### Statement\s*[\r\n]+([\s\S]*?)(?=^### Acceptance Criteria\s*$)/m);
  const statement = statementMatch?.[1] ?? '';
  const acLines = content.match(/^- AC-\d{3}:[^\r\n]+/gm) ?? [];
  const reqText = [statement, ...acLines].join('\n');

  if (requirementClass === 'functional' && /\d+秒以内/.test(reqText)) {
    leaks.push('functional requirement must not declare timing SLA (move to SPEC Constraints)');
  }
  if (/\d+px\b/i.test(reqText)) {
    leaks.push('pixel dimensions (e.g. 1920px)');
  }
  if (/\bSticky\b/i.test(reqText)) {
    leaks.push('CSS presentation token "Sticky"');
  }
  if (/ベジェ|Bezier/i.test(reqText)) {
    leaks.push('rendering technique (Bezier)');
  }
  if (/depends_on:\s*\[/i.test(reqText)) {
    leaks.push('schema field notation "depends_on: [...]"');
  }
  if (/`(?:get|check)_[a-z_]+`/i.test(reqText)) {
    leaks.push('MCP tool identifier in backticks');
  }
  if (/\btraceweave\s+[a-z][a-z0-9-]*/i.test(reqText)) {
    leaks.push('CLI subcommand invocation (route command names to SPEC)');
  }
  if (CLI_SUBCOMMAND_BACKTICK.test(reqText)) {
    leaks.push('CLI subcommand name in backticks (route to SPEC)');
  }

  return leaks;
}

export function validateDocs(docsDir: string = DEFAULT_DOCS_DIR): {
  passed: boolean;
  errors: string[];
  warnings: string[];
  docs: DocItem[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const docs: DocItem[] = [];
  const allIds = new Set<string>();

  if (!fs.existsSync(docsDir)) {
    return { passed: true, errors: [], warnings: [], docs: [] };
  }

  const subdirs = fs.readdirSync(docsDir);
  for (const subdir of subdirs) {
    const fullSubdir = path.join(docsDir, subdir);
    if (!fs.statSync(fullSubdir).isDirectory()) continue;
    const files = fs.readdirSync(fullSubdir);
    for (const file of files) {
      if (!file.endsWith('.md') || file.startsWith('.')) continue;
      const filePath = path.join(fullSubdir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      try {
        const parsed = matter(raw);
        docs.push({
          filePath,
          meta: parsed.data,
          body: parsed.content,
        });
        if (parsed.data.id) {
          allIds.add(parsed.data.id);
        }
      } catch (e: any) {
        errors.push(`${filePath}: Failed to parse frontmatter: ${e.message}`);
      }
    }
  }

  for (const doc of docs) {
    const { filePath, meta, body } = doc;
    const parentDir = path.basename(path.dirname(filePath));
    const stem = path.basename(filePath, '.md');
    const fid = meta.id;
    const kind = meta.kind;

    if (!KINDS[parentDir]) {
      continue;
    }

    const { kind: expectedKind, prefix } = KINDS[parentDir];
    if (kind !== expectedKind) {
      errors.push(`${filePath}: Kind mismatch: expected "${expectedKind}", got "${kind}"`);
    }
    if (stem !== fid) {
      errors.push(`${filePath}: Filename stem "${stem}" != id "${fid}"`);
    }
    const idPattern = new RegExp(`^${prefix}-\\d{4,}$`);
    if (!idPattern.test(fid)) {
      errors.push(`${filePath}: Invalid id format "${fid}", expected matching prefix "${prefix}-XXXX"`);
    }

    if (meta.schema_version !== 3) {
      errors.push(`${filePath}: schema_version != 3 (got ${meta.schema_version})`);
    }

    const validStatuses = ['draft', 'proposed', 'accepted', 'rejected', 'superseded', 'deprecated'];
    if (!validStatuses.includes(meta.status)) {
      errors.push(`${filePath}: Invalid status "${meta.status}"`);
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(String(meta.created ?? ''))) {
      errors.push(`${filePath}: Invalid created date "${meta.created}"`);
    }
    if (!datePattern.test(String(meta.updated ?? ''))) {
      errors.push(`${filePath}: Invalid updated date "${meta.updated}"`);
    }

    const scope = meta.scope;
    if (scope !== 'local' && scope !== 'cross_cutting') {
      errors.push(`${filePath}: Invalid scope "${scope}"`);
    }
    if (scope === 'cross_cutting' && kind !== 'design' && kind !== 'quality_assurance') {
      errors.push(`${filePath}: scope "cross_cutting" not allowed for kind "${kind}"`);
    }

    for (const arrField of ['depends_on', 'tags', 'links']) {
      if (!Array.isArray(meta[arrField])) {
        errors.push(`${filePath}: Field "${arrField}" must be an array`);
      }
    }

    if (kind === 'requirement') {
      if (meta.criticality && !['high', 'medium', 'low'].includes(meta.criticality)) {
        errors.push(`${filePath}: requirement criticality must be high, medium, or low (got ${meta.criticality})`);
      }
      if (!meta.requirement_class) {
        errors.push(`${filePath}: requirement must declare requirement_class (functional or non_functional)`);
      } else if (!['functional', 'non_functional'].includes(meta.requirement_class)) {
        errors.push(
          `${filePath}: requirement requirement_class must be functional or non_functional (got ${meta.requirement_class})`
        );
      }
    }

    if (kind === 'test_case') {
      if (meta.execution_status !== undefined) {
        errors.push(`${filePath}: execution_status must not be defined in test_case frontmatter. Test outcomes must be separated into execution reports (ADR-0006)`);
      }
      if (meta.actual_result !== undefined) {
        errors.push(`${filePath}: actual_result must not be defined in test_case frontmatter. Test outcomes must be separated into execution reports (ADR-0006)`);
      }
      const tcContentSplit = body.split(/^## Content\s*$/m);
      if (tcContentSplit.length >= 2) {
        const tcContentBody = tcContentSplit.slice(1).join('## Content');
        const tcHeadings = (tcContentBody.match(/^### [^\r\n]+/gm) || []).map((h) => h.trim());
        const forbiddenTcSections = ['### Actual Results', '### Evidence'];
        for (const forbidden of forbiddenTcSections) {
          if (tcHeadings.includes(forbidden)) {
            errors.push(
              `${filePath}: Forbidden section "${forbidden.replace(/^### /, '')}" must not appear in test_case body. Test outcomes must be separated into execution reports (ADR-0006)`
            );
          }
        }
      }
      if (!VALID_TEST_LEVELS.includes(meta.test_level)) {
        errors.push(`${filePath}: Invalid test_level "${meta.test_level}". Expected one of ${VALID_TEST_LEVELS.join(', ')}`);
      }
      if (!VALID_TEST_METHODS.includes(meta.test_method)) {
        errors.push(`${filePath}: Invalid test_method "${meta.test_method}". Expected one of ${VALID_TEST_METHODS.join(', ')}`);
      }
      const isUnitLevel = meta.test_level === 'unit';
      if (!Array.isArray(meta.verifies)) {
        errors.push(`${filePath}: test_case verifies must be an array of IDs`);
      } else if (!isUnitLevel && meta.verifies.length === 0) {
        errors.push(`${filePath}: test_case verifies must be a non-empty array of IDs`);
      } else {
        for (const vid of meta.verifies) {
          if (!allIds.has(vid)) {
            errors.push(`${filePath}: verifies target "${vid}" not found`);
          }
          if (isUnitLevel && (String(vid).startsWith('REQ-') || String(vid).startsWith('SPEC-'))) {
            errors.push(
              `${filePath}: unit test_case must not verify REQ/SPEC (use DSN- or omit verifies; unit coverage is measured by code instrumentation)`
            );
          }
        }
      }
    }

    if (kind === 'use_case') {
      if (!Array.isArray(meta.actor_refs)) {
        errors.push(`${filePath}: use_case actor_refs must be an array`);
      } else {
        for (const aid of meta.actor_refs) {
          if (!allIds.has(aid) || !aid.startsWith('ACT-')) {
            errors.push(`${filePath}: actor_refs target "${aid}" not found or not ACT-`);
          }
        }
      }
      if (!Array.isArray(meta.requirement_refs)) {
        errors.push(`${filePath}: use_case requirement_refs must be an array`);
      } else {
        for (const rid of meta.requirement_refs) {
          if (!allIds.has(rid) || !rid.startsWith('REQ-')) {
            errors.push(`${filePath}: requirement_refs target "${rid}" not found or not REQ-`);
          }
        }
      }
    }

    // Depends_on direction checks
    const deps: string[] = meta.depends_on || [];
    for (const dep of deps) {
      if (!allIds.has(dep)) {
        errors.push(`${filePath}: dependency target "${dep}" not found`);
      }
    }

    if (['need', 'actor', 'use_case', 'glossary', 'decision'].includes(kind)) {
      if (deps.length > 0) {
        errors.push(`${filePath}: ${kind} must have depends_on: []`);
      }
    } else if (kind === 'requirement') {
      for (const dep of deps) {
        if (!dep.startsWith('NEED-')) {
          errors.push(`${filePath}: requirement dependency "${dep}" must start with NEED-`);
        }
      }
      if (deps.length > 1) {
        errors.push(`${filePath}: requirement cannot depend on multiple needs (must be 1:N)`);
      }
    } else if (kind === 'specification') {
      // Standalone specifications (depends_on: []) are allowed for lightweight / contract-first patterns
      for (const dep of deps) {
        if (!dep.startsWith('REQ-')) {
          errors.push(`${filePath}: specification dependency "${dep}" must start with REQ-`);
        }
      }
    } else if (kind === 'design') {
      if (scope !== 'cross_cutting' && deps.length === 0) {
        errors.push(`${filePath}: local design must depend on at least one SPEC-`);
      }
      for (const dep of deps) {
        if (!dep.startsWith('SPEC-')) {
          errors.push(`${filePath}: design dependency "${dep}" must start with SPEC-`);
        }
      }
    } else if (kind === 'quality_assurance') {
      if (scope !== 'cross_cutting' && deps.length === 0) {
        errors.push(`${filePath}: local quality_assurance must depend on REQ- or SPEC-`);
      }
      for (const dep of deps) {
        if (!dep.startsWith('REQ-') && !dep.startsWith('SPEC-')) {
          errors.push(`${filePath}: quality_assurance dependency "${dep}" must start with REQ- or SPEC-`);
        }
      }
      const codePathRegex = /(?:tests?|src)\/[a-zA-Z0-9_\-\/]+\.(?:ts|js|tsx|jsx)/g;
      const foundCodePaths = body.match(codePathRegex);
      if (foundCodePaths && foundCodePaths.length > 0) {
        errors.push(
          `${filePath}: quality_assurance must not reference implementation or test files directly. Found: ${foundCodePaths.join(', ')}`
        );
      }
    }

    // Links check
    for (const lid of (meta.links || [])) {
      if (!allIds.has(lid)) {
        errors.push(`${filePath}: link target "${lid}" not found`);
      }
    }

    // External interface tags check
    if (meta.tags?.includes('interface') && !meta.tags?.includes('external')) {
      errors.push(`${filePath}: tags contains "interface" but missing "external" (Interface Control Document standard)`);
    }

    // Out-of-Scope boundary guard for active REQ/SPEC
    if ((kind === 'requirement' || kind === 'specification') && !isRetiredDocStatus(meta.status)) {
      const outOfScopeTags = ['clean-root', 'encapsulation', 'bin-wrapper', 'repository-structure'];
      const matchedOosTags = (meta.tags || []).filter((t: string) => outOfScopeTags.includes(t));
      if (matchedOosTags.length > 0) {
        errors.push(`${filePath}: Active ${kind} must not manage out-of-scope concerns (${matchedOosTags.join(', ')}). Use ADR instead.`);
      }
    }

    // Headings check
    const contentSplit = body.split(/^## Content\s*$/m);
    if (contentSplit.length < 2) {
      errors.push(`${filePath}: Missing "## Content" heading`);
    } else {
      const contentBody = contentSplit.slice(1).join('## Content');
      const expectedHeadings = HEADINGS[kind] || [];
      const rawMatches = contentBody.match(/^### [^\r\n]+/gm) || [];
      const foundHeadings = rawMatches.map(h => h.trim());

      const matches = JSON.stringify(foundHeadings) === JSON.stringify(expectedHeadings);

      if (!matches) {
        errors.push(
          `${filePath}: Headings mismatch for kind "${kind}".\n  Expected: ${expectedHeadings.join(', ')}\n  Found:    ${foundHeadings.join(', ')}`
        );
      }
    }

    if (kind === 'need' && !isRetiredDocStatus(meta.status)) {
      const needLeaks = findNeedImplementationLeaks(body);
      for (const leak of needLeaks) {
        errors.push(
          `${filePath}: [fence-lite] need must not name implementation artifacts (found ${leak}). Express outcomes only.`
        );
      }
    }

    if (kind === 'requirement' && !isRetiredDocStatus(meta.status)) {
      const acLines = body.match(/^- AC-\d{3}:[^\r\n]+/gm) || [];
      if (acLines.length === 0) {
        errors.push(`${filePath}: [fence-lite] requirement must declare at least one "- AC-xxx:" criterion`);
      }
      for (const line of acLines) {
        if (!/^- AC-\d{3}: Given .+ When .+ Then .+/.test(line)) {
          errors.push(
            `${filePath}: [fence-lite] Acceptance criterion must follow "- AC-xxx: Given ... When ... Then ...": ${line}`
          );
        }
      }
      const reqLeaks = findRequirementFenceLeaks(body, meta.requirement_class);
      for (const leak of reqLeaks) {
        errors.push(`${filePath}: [fence-lite] requirement must express observable outcomes only (found ${leak})`);
      }
    }

    if ((kind === 'requirement' || kind === 'specification') && !isRetiredDocStatus(meta.status)) {
      const implPathRegex = /(?:tests?|src)\/[a-zA-Z0-9_\-\/]+\.(?:ts|js|tsx|jsx)/g;
      const foundImplPaths = body.match(implPathRegex);
      if (foundImplPaths && foundImplPaths.length > 0) {
        errors.push(
          `${filePath}: [fence-lite] ${kind} must not reference implementation or test files directly. Found: ${foundImplPaths.join(', ')}`
        );
      }
    }

    if (kind === 'test_case' && Array.isArray(meta.verifies)) {
      for (const vid of meta.verifies) {
        const target = String(vid);
        const isUnit = meta.test_level === 'unit';
        if (isUnit) {
          if (!target.startsWith('DSN-') && !target.startsWith('ADR-')) {
            errors.push(
              `${filePath}: [fence-lite] unit test_case verifies target "${vid}" must be DSN- or ADR- (not REQ/SPEC)`
            );
          }
        } else if (!target.startsWith('REQ-') && !target.startsWith('SPEC-') && !target.startsWith('ADR-')) {
          errors.push(`${filePath}: [fence-lite] verifies target "${vid}" must be REQ-, SPEC-, or ADR-`);
        }
      }
    }
  }

  // Check SPEC coverage for active requirements
  const activeReqIds = new Set<string>();
  const reqCoveredBySpec = new Set<string>();

  for (const doc of docs) {
    if (doc.meta.kind === 'requirement' && !isRetiredDocStatus(doc.meta.status)) {
      activeReqIds.add(doc.meta.id);
    }
    if (doc.meta.kind === 'specification' && !isRetiredDocStatus(doc.meta.status)) {
      for (const dep of doc.meta.depends_on || []) {
        if (dep.startsWith('REQ-')) {
          reqCoveredBySpec.add(dep);
        }
      }
    }
  }

  for (const reqId of activeReqIds) {
    if (!reqCoveredBySpec.has(reqId)) {
      warnings.push(
        `Coverage gap: Active requirement "${reqId}" has no matching specification (SPEC-) depending on it.`
      );
    }
  }

  // Check DSN coverage for active specifications
  const activeSpecIds = new Set<string>();
  const specCoveredByDsn = new Set<string>();

  for (const doc of docs) {
    if (doc.meta.kind === 'specification' && !isRetiredDocStatus(doc.meta.status)) {
      activeSpecIds.add(doc.meta.id);
    }
    if (doc.meta.kind === 'design') {
      for (const dep of (doc.meta.depends_on || [])) {
        specCoveredByDsn.add(dep);
      }
      for (const link of (doc.meta.links || [])) {
        if (link.startsWith('SPEC-')) {
          specCoveredByDsn.add(link);
        }
      }
    }
  }

  for (const specId of activeSpecIds) {
    if (!specCoveredByDsn.has(specId)) {
      errors.push(`Coverage gap: Active specification "${specId}" has no matching design (DSN-) depending on or linking it.`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    docs,
  };
}

