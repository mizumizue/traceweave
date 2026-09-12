---
name: document-authoring
description: Decompose stakeholder needs into requirements, specifications, and designs (1:N refinement chain) and author structured docs under docs/ with strict schema compliance. Use when reverse-engineering existing code into docs/, authoring new requirements, specifications, designs, ADRs, QA docs, or test cases.
---

# Document Authoring

Use `.cursor/rules/docs-document-schema.mdc` as the single source of truth for schemas,
headings, and allowed fields before editing any file under `docs/`.

## Leading words

**trace** — Dig upstream: unearth the true stakeholder needs from conversation logs, user requests, or existing codebase behavior before touching docs.
**decompose** — Break down 1:N: branch one need into multiple atomic requirements, one requirement into multiple specifications, and one specification into multiple designs.
**wire** — Connect unidirectional change-impact dependencies (`NEED <- REQ <- SPEC <- DSN`) via `depends_on`, while routing ordinary references to `links`, `actor_refs`, or `verifies`.
**verify** — Prove mechanical correctness with `npm run lint` (`tsx scripts/validate-docs.ts`) and linters before declaring completion.

## Steps

### 1. trace (Unearth upstream intent)

Identify overarching stakeholder needs and actors:
1. When reverse-engineering from code (`@src`) or user conversation (`agent-transcripts`):
   - Extract core user problems, operational goals, and design motivations.
   - Separate actor roles (`ACT-`) and use case scenarios (`UC-`) from implementation mechanics.
   - For external integrations, identify external systems (CLI, external services, APIs) as distinct `ACT-` actors.
2. Group related functionality into distinct stakeholder needs. Keep units focused on user outcomes rather than classes or functions.

**Completion criterion**: A prioritized list of stakeholder needs is identified, and involved actors (including external systems) are mapped.

### 2. decompose (Refine 1:N down the hierarchy)

Decompose each level into independent, single-responsibility units:
1. **Need -> Requirements (`REQ-`)**: Decompose one need into 1:N observable user/system outcomes. Define Acceptance Criteria using `- AC-xxx: Given ... When ... Then ...`. Keep implementation details out of requirements.
2. **Requirement -> Specifications (`SPEC-`)**: Decompose one requirement into 1:N behavioral contracts. Specify Inputs, Outputs, Errors, and Constraints.
   - **External Interfaces**: Treat `SPEC-` as Interface Control Documents (ICD) for external boundaries. Tag them with `tags: [interface, external, <target>]` when specifying protocols, schemas, and interface constraints.
3. **Specification -> Designs (`DSN-`)**: Decompose one specification into 1:N structural decisions, component boundaries, data flows, and trade-offs. Reserve `scope: cross_cutting` (`depends_on: []`) exclusively for overarching repository architecture.
   - **External Adapters**: Specify modular architecture (ports & adapters), resilience patterns (retries, timeouts, fallback structures), and error translation boundaries.
4. **Decisions (`ADR-`) & Quality / Tests (`QA-` / `TC-`)**:
   - Extract standalone architectural decisions into `ADR-` (`docs/decisions/`).
   - Define verification criteria, quality characteristics, and testing strategy in `QA-` (`docs/quality/`). Keep implementation and test file paths out of `QA-`.
   - Define concrete test procedures, verification steps, and execution evidence in `TC-` (`docs/test-cases/`).

**Completion criterion**: Every meaning unit is isolated in its own file under the matching directory with the next unused ID. No file bundles multiple independent outcomes.

### 3. wire (Establish unidirectional traceability)

Bind documents following strict dependency and reference rules:
1. **Refinement hierarchy (`depends_on`)**:
   - `need`: `depends_on: []` (must always be empty, topmost upstream).
   - `requirement`: `[NEED-xxxx]` when need-originated, or `[]` when requirement-originated.
   - `specification`: 1 or more `REQ-` IDs only.
   - `design`: 1 or more `SPEC-` IDs only (unless `scope: cross_cutting`).
   - Never introduce reverse references, skips (`design` directly depending on `requirement`), or cycles.
2. **Lateral & tracking references**:
   - `use_case`: Put `actor_refs: [ACT-...]` and `requirement_refs: [REQ-...]` in frontmatter (`depends_on: []`).
   - `test_case`: Put `test_level: ...`, `test_method: ...`, and `verifies: [SPEC-..., REQ-...]` in frontmatter.
   - `quality_assurance`: Put verified `REQ-` or `SPEC-` in `depends_on`. Optionally route realized test cases to `links: [TC-...]`.
   - `decision`: Put related designs in `links: [DSN-...]`, `depends_on: []`.
   - Use `links` solely for non-dependency cross-references.

**Completion criterion**: All frontmatter lists are YAML arrays, all referenced IDs exist, and `depends_on` arrows flow strictly upstream without reverse dependencies.

### 4. draft (Author structured content)

Write Markdown content adhering strictly to schema headings:
1. Place YAML frontmatter ending with `---`, followed immediately by exactly one `## Content` heading.
2. Under `## Content`, include only the required `###` subheadings in the exact order prescribed by `.cursor/rules/docs-document-schema.mdc`.
3. Keep prose tight and checkable. Delegate structural explanations to `design` rather than repeating them in `requirement` or `specification`.

**Completion criterion**: Every document contains the exact heading sequence for its `kind`, with complete frontmatter metadata.

### 5. verify (Run deterministic validation)

Validate all documents against schema constraints:
1. Run the project validation script:
   ```bash
   npm run lint
   ```
2. Inspect and resolve any detected errors:
   - Unknown kind or directory mismatch.
   - Invalid ID format or filename stem mismatch.
   - Missing required frontmatter fields or non-array lists.
   - Dangling reference IDs or illegal dependency directions.
   - Heading name, count, or ordering mismatches.
3. Run workspace linters on modified files to verify formatting.

**Completion criterion**: `npm run lint` terminates with exit code 0 (`PASS: All XX docs files strictly follow docs-document-schema.mdc!`) and zero linter diagnostics.

## Failure modes to avoid

- **Premature 1:1 bundling**: Collapsing a complex requirement directly into one specification and one design. If there are multiple distinct contracts or structures, split them 1:N.
- **Implementation leaking upstream**: Mentioning specific classes, SQLite tables, or code modules in `requirement` or `specification`. Keep them purely in `design`.
- **Implementation leaking into QA**: Referencing specific test files (e.g. `tests/**/*.test.ts`) or source code symbols directly in `quality_assurance` documents. `QA-` must specify quality criteria, test levels/methods, and aggregated evidence, delegating concrete test scripts and execution logs to `test_case` (`TC-`).
- **Dependency inversion**: Adding a `depends_on` from a requirement to a specification, or between sibling specifications.
- **Hidden N:M clutter**: Using N:M dependencies to mask coarse, multi-topic documents. Split documents before linking.
- **Skipping automated validation**: Assuming Markdown formatting is correct without running `npm run lint`.
