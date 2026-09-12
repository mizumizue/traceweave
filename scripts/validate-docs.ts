import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');

const require = createRequire(import.meta.url);
const srcPackage = path.join(ROOT, 'src', 'package.json');
const matter = fs.existsSync(srcPackage)
  ? createRequire(srcPackage)('gray-matter')
  : require('gray-matter');

const KINDS: Record<string, { kind: string; prefix: string }> = {
  needs: { kind: 'need', prefix: 'NEED' },
  actors: { kind: 'actor', prefix: 'ACT' },
  usecases: { kind: 'use_case', prefix: 'UC' },
  requirements: { kind: 'requirement', prefix: 'REQ' },
  specifications: { kind: 'specification', prefix: 'SPEC' },
  design: { kind: 'design', prefix: 'DSN' },
  decisions: { kind: 'decision', prefix: 'ADR' },
  quality: { kind: 'quality_assurance', prefix: 'QA' },
  'test-cases': { kind: 'test_case', prefix: 'TC' },
};

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
    '### Evidence',
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

export function validateDocs(docsDir: string = DOCS_DIR): { passed: boolean; errors: string[]; docs: DocItem[] } {
  const errors: string[] = [];
  const docs: DocItem[] = [];
  const allIds = new Set<string>();

  if (!fs.existsSync(docsDir)) {
    return { passed: true, errors: [], docs: [] };
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
      errors.push(`${filePath}: Unknown parent directory "${parentDir}"`);
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
    }

    if (kind === 'test_case') {
      if (meta.execution_status && !['passed', 'failed', 'pending', 'skipped'].includes(meta.execution_status)) {
        errors.push(`${filePath}: Invalid execution_status "${meta.execution_status}". Expected passed, failed, pending, or skipped`);
      }
      if (!VALID_TEST_LEVELS.includes(meta.test_level)) {
        errors.push(`${filePath}: Invalid test_level "${meta.test_level}". Expected one of ${VALID_TEST_LEVELS.join(', ')}`);
      }
      if (!VALID_TEST_METHODS.includes(meta.test_method)) {
        errors.push(`${filePath}: Invalid test_method "${meta.test_method}". Expected one of ${VALID_TEST_METHODS.join(', ')}`);
      }
      if (!Array.isArray(meta.verifies) || meta.verifies.length === 0) {
        errors.push(`${filePath}: test_case verifies must be a non-empty array of IDs`);
      } else {
        for (const vid of meta.verifies) {
          if (!allIds.has(vid)) {
            errors.push(`${filePath}: verifies target "${vid}" not found`);
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

    if (['need', 'actor', 'use_case', 'decision'].includes(kind)) {
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
      if (deps.length === 0) {
        errors.push(`${filePath}: specification must depend on at least one REQ-`);
      }
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
    if ((kind === 'requirement' || kind === 'specification') && meta.status !== 'deprecated') {
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

      let matches = JSON.stringify(foundHeadings) === JSON.stringify(expectedHeadings);
      if (!matches && kind === 'test_case') {
        const expectedWithActual = [
          '### Objective',
          '### Preconditions',
          '### Steps',
          '### Expected Results',
          '### Actual Results',
          '### Evidence',
        ];
        matches = JSON.stringify(foundHeadings) === JSON.stringify(expectedWithActual);
      }

      if (!matches) {
        errors.push(
          `${filePath}: Headings mismatch for kind "${kind}".\n  Expected: ${expectedHeadings.join(', ')}\n  Found:    ${foundHeadings.join(', ')}`
        );
      }
    }
  }

  // Check DSN coverage for active specifications
  const activeSpecIds = new Set<string>();
  const specCoveredByDsn = new Set<string>();

  for (const doc of docs) {
    if (doc.meta.kind === 'specification' && doc.meta.status !== 'deprecated') {
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
    docs,
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate-docs.ts')) {
  const result = validateDocs();
  if (!result.passed) {
    console.error(`\x1b[31mFAIL: ${result.errors.length} validation error(s) found:\x1b[0m`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  } else {
    console.log(`\x1b[32mPASS: All ${result.docs.length} docs strictly follow docs-document-schema.mdc!\x1b[0m`);
    process.exit(0);
  }
}
