---
name: traceweave-document-authoring
description: Decompose needs into strict V-model documents (NEED -> REQ -> SPEC -> DSN), guard abstraction boundaries, and audit via SubAgent. Use when authoring or revising requirements, specifications, designs, ADRs, or test cases.
---

# Document Authoring

Use `.cursor/rules/docs-document-schema.mdc` as the single source of truth for schemas, headings, and allowed fields.

## Leading words

**trace** — Dig upstream: unearth true stakeholder needs and external actors before touching docs.
**decompose** — Branch 1:N: divide needs into atomic requirements, requirements into specifications, and specifications into designs.
**fence** — Guard abstraction: express requirements purely as observable outcomes (What); specify interface contracts, schemas, protocols, and external boundaries in specifications (Contract / ICD); confine internal module structures, classes, algorithms, and trade-offs strictly to designs (How & Why).
**wire** — Connect unidirectional dependencies (`NEED <- REQ <- SPEC <- DSN`) via `depends_on`, ensuring 100% DSN coverage for every active specification.
**verify** — Run deterministic validation (`npm --prefix src run lint`) to prove mechanical schema, boundary, and graph correctness.
**audit** — Launch an independent SubAgent reviewer using the structured audit template to inspect abstraction boundaries and acceptance criteria format before declaring completion.

## Steps

### 1. trace (Unearth upstream intent)

Identify overarching stakeholder needs and actors:
1. Extract core user problems, operational goals, and design motivations from request or transcripts.
2. Separate actor roles (`ACT-`) and use case scenarios (`UC-`) from implementation mechanics.
3. For external systems (CLI, browser, external APIs, filesystem), verify matching `ACT-` actors exist in `docs/actors/` (author them if missing).

**Completion criterion**: A prioritized list of stakeholder needs is mapped to distinct actors, external boundary actors are identified, and environment/repository management is routed to ADR rather than NEED.

### 2. decompose & fence (Refine 1:N and guard abstraction)

Decompose each level into independent, single-responsibility units:
1. **Need -> Requirements (`REQ-`)**:
   - Focus exclusively on observable external outcomes (What).
   - Confine vocabulary to domain behaviors; express acceptance criteria strictly as `- AC-xxx: Given <preconditions> When <trigger/action> Then <observable result>`.
2. **Requirement -> Specifications (`SPEC-`)**:
   - Focus on interface contracts and external boundaries (Contract / ICD).
   - Define exact inputs, outputs, error representations, and environmental constraints.
   - For external boundaries (CLI, Web UI, API), attach `tags: [interface, external, <target>]`.
   - Delegate class structures, module splits, private algorithms, and architectural trade-offs to `DSN-`.
3. **Specification -> Designs (`DSN-`)**:
   - Focus on internal architecture, component composition, data flows, and trade-offs (How & Why).
   - For external interfaces, specify adapter boundaries (ports & adapters, retries, timeouts, and fallback policies).
   - Justify chosen patterns (hexagonal, seams) and document rejected alternatives.
   - Every active `SPEC-` must have at least one matching `DSN-` depending on it.
4. **Decisions (`ADR-`) & Quality / Tests (`QA-` / `TC-`)**:
   - Route repository layout, dependency encapsulation, and architectural decisions to `ADR-`.
   - Route verification strategy and quality criteria to `QA-` (keep implementation paths `src/...` and test paths `tests/**/*.test.ts` strictly out).
   - Route concrete verification steps and execution evidence to `TC-`.

**Completion criterion**: Every unit is in its own file under the matching directory with the next sequence ID. Zero implementation mechanics leak into REQ; zero internal structures leak into SPEC; zero code paths leak into QA.

### 3. wire (Establish unidirectional traceability)

Bind documents following strict dependency rules:
1. **Refinement chain (`depends_on`)**:
   - `need`, `actor`, `use_case`, `decision`: `depends_on: []`
   - `requirement`: `[NEED-xxxx]` (or `[]` if requirement-originated)
   - `specification`: 1 or more `REQ-xxxx` (or `[]` for standalone/contract-first specifications)
   - `design`: 1 or more `SPEC-xxxx` (or `scope: cross_cutting` with `depends_on: []`)
   - `quality_assurance`: 1 or more `REQ-xxxx` or `SPEC-xxxx` (optional `links: [TC-xxxx, ...]`)
   - `test_case`: 1 or more targets in `verifies: [REQ-..., SPEC-...]` (`depends_on: []`)
   - `use_case`: map `actor_refs: [ACT-...]`, `requirement_refs: [REQ-...]`
   - `decision`: map related architecture designs to `links: [DSN-...]`
2. **DSN Coverage Check**:
   - Ensure every non-deprecated `SPEC-` is referenced in `depends_on` or `links` of at least one `DSN-`.

**Completion criterion**: All references exist, dependency arrows flow strictly upstream without cycles, and DSN coverage for all active specifications is 100%.

### 4. draft (Author structured content)

Write Markdown content adhering strictly to schema headings:
1. Place YAML frontmatter ending with `---`, followed immediately by exactly one `## Content` heading.
2. Under `## Content`, include only the required `###` subheadings in the exact order prescribed by `.cursor/rules/docs-document-schema.mdc`.
3. Express acceptance criteria as `- AC-xxx: Given ... When ... Then ...`.

**Completion criterion**: Every document contains the exact heading sequence for its `kind`, with valid frontmatter metadata.

### 5. verify (Run deterministic validation)

Run the project validation script:
```bash
npm --prefix src run lint
```
Resolve any detected failures:
- Kind/directory mismatch, invalid ID, or filename stem mismatch.
- Missing required fields, dangling dependencies, or cycles.
- Out-of-Scope boundary violations in active requirements or specifications.
- Missing `external` tag on interface specifications.
- DSN coverage gaps for active specifications.

**Completion criterion**: `npm --prefix src run lint` terminates with exit code 0 (`PASS: All XX docs strictly follow docs-document-schema.mdc!`).

### 6. audit (Independent Review Gate)

For major features or new multi-document trees, run the `traceweave-docs-audit` skill (full branch) or launch an independent SubAgent via the `Task` tool (`generalPurpose`) using its fence-deep checklist. (For small revisions, localized doc fixes, or lightweight changes, `npm --prefix src run lint` alone is sufficient).

#### SubAgent Prompt Template:
```text
Task: Audit documents for abstraction fences, system boundaries, and schema compliance.
Target Documents: <list of added or modified files>

Inspect against these 8 checks:
1. System Boundary: Are repository/environment configuration concerns (Out-of-Scope in SYSTEM_OVERVIEW.md) kept out of REQ/SPEC and routed to ADR?
2. Abstraction Fence (REQ): Are requirements expressed purely as observable outcomes (What), free of internal class names, source paths, or third-party library names?
3. Abstraction Fence (SPEC): Are specifications expressed as interface contracts (Contract/ICD), delegating internal class division, private algorithms, and trade-offs to DSN?
4. DSN Coverage: Does every active SPEC have a corresponding DSN?
5. AC Discipline: Do all acceptance criteria follow "- AC-xxx: Given ... When ... Then ..."?
6. External Interface Discipline: Do external interface specifications have tags [interface, external, <target>] and matching ACT- actors?
7. QA Abstraction: Do QA- documents strictly avoid referencing test/source code paths (tests/**/*.test.ts, src/...) and internal implementation symbols?
8. Traceability Integrity: Are dependency arrows flowing strictly upstream without skips or cycles, and are use_case/decision/TC references (actor_refs, links, verifies) properly mapped?

Report findings with exact file paths and line numbers. State PASS or FAIL clearly.
```

**Completion criterion**: SubAgent reports PASS with zero abstraction leaks, zero boundary violations, 100% DSN coverage, full AC format compliance, and complete reference integrity.

## Failure modes to avoid

- **Premature 1:1 bundling**: Collapsing a complex requirement directly into one specification and one design. If there are multiple distinct contracts or structures, split them 1:N.
- **Implementation leaking upstream**: Mentioning specific classes, database tables, library packages, or DOM elements in `requirement` or `specification`. Confine them to `design`.
- **Implementation leaking into QA**: Referencing specific test files (`tests/**/*.test.ts`) or source code symbols in `quality_assurance` documents. `QA-` must specify quality criteria, test levels/methods, and aggregated evidence, delegating concrete test scripts and execution logs to `test_case` (`TC-`).
- **Bypassing external actors**: Defining interface specifications without identifying or authoring the corresponding external actor (`ACT-`).
- **Dependency inversion or skips**: Adding dependencies from requirement to specification, between sibling specifications, or skipping specification to link design directly to requirement.
- **Skipping automated validation or audit**: Declaring completion without running `npm --prefix src run lint` and passing the independent SubAgent review gate.
