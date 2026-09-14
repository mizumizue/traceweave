# Fence-Deep Checks

Semantic audit beyond `validate-docs.ts` (fence-lite). Apply every check to each active (`status` not `deprecated` / `superseded`) document in scope.

Reference: `.cursor/rules/docs-document-schema.mdc`, `docs/SYSTEM_OVERVIEW.md`.

## 1. System boundary

Repository layout, dependency encapsulation, build output paths, and CI/process concerns must live in `ADR-`, not active `REQ-` / `SPEC-`.

- Reject Out-of-Scope tags on active REQ/SPEC: `clean-root`, `encapsulation`, `bin-wrapper`, `repository-structure`.
- Route environment/repo chores to ADR or path-D direct implementation.

## 1b. Abstraction fence (NEED) — mechanical

Active `need` documents must not name implementation artifacts in any `## Content` section (`Background`, `Problem`, `Desired Outcome`).

- **Mechanical (fence-lite)**: reject lowercase package names or PascalCase component names in backticks (e.g. `` `sonner` ``, `` `VisualTestPyramid` ``). Document IDs (`REQ-0001`) and schema field tokens (`depends_on`, `verifies`, `actor_refs`, `requirement_refs`, `links`) are allowed.

## 2. Abstraction fence (REQ)

Requirements express observable outcomes (What) only.

- No internal class names, module splits, library packages, DOM selectors, or `src/` / `tests/` paths.
- Acceptance criteria follow `- AC-xxx: Given ... When ... Then ...` with observable Then clauses.
- **Mechanical (fence-lite)**: active REQ must not contain pixel dimensions (`1920px`), CSS tokens (`Sticky`), rendering techniques (`Bezier` / `ベジェ`), schema field notation (`depends_on: [...]`), MCP tool identifiers in backticks (`get_*`, `check_*`), CLI invocations (`traceweave check`), or CLI subcommand names in backticks (`` `check` ``, `` `serve` ``). Functional REQ must not declare timing SLAs (`N秒以内`). Route command names and contracts to SPEC; route SLAs to SPEC Constraints. Link `links: [SPEC-xxxx]` when referencing external CLI contracts.

## 3. Abstraction fence (SPEC)

Specifications express interface contracts (Contract / ICD) only.

- Inputs, outputs, errors, constraints, protocols, schemas — not internal class diagrams or algorithm choices.
- Internal structure, data flow, and trade-offs belong in `DSN-`.

## 4. DSN coverage

Every active `SPEC-` must be referenced by at least one `DSN-` via `depends_on` or `links`.

## 5. AC discipline

Active `REQ-` documents declare at least one AC line; each line uses Given/When/Then with testable Then outcomes.

## 6. External interface discipline

`SPEC-` with `tags: [interface, ...]` must include `external` and a target tag (`cli`, `mcp`, `web-api`, etc.).

Matching `ACT-` actor documents must exist for external boundaries.

## 7. QA abstraction

`QA-` documents must not reference `src/...`, `tests/...`, class names, or function names.

Quality criteria and evidence strategy only; concrete steps live in `TC-`.

## 8. Traceability integrity

- `depends_on` flows upstream: `NEED <- REQ <- SPEC <- DSN`.
- `need`, `actor`, `use_case`, `decision`, `test_case`: `depends_on: []`.
- `use_case` `actor_refs` / `requirement_refs`, `decision` `links`, `test_case` `verifies` resolve to existing IDs.
- No dependency skips (REQ → DSN without SPEC) or cycles (also checked by `./bin/traceweave check`).
