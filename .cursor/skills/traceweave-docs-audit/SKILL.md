---
name: traceweave-docs-audit
description: Audit TraceWeave documentation governance — schema, traceability, abstraction fences, and repository guards. Use when auditing docs, checking V-model compliance, validating document management, or reviewing doc changes before merge.
---

# Documentation Governance Audit

Verify that `docs/` and related governance artifacts comply with TraceWeave rules — mechanically first, semantically second.

Schema reference: `.cursor/rules/docs-document-schema.mdc`. Boundary reference: `docs/SYSTEM_OVERVIEW.md`.

## Leading words

**sweep** — Run deterministic validators (`run-governance-lint.ts`, `./bin/traceweave check`) before any subjective judgment.
**fence-deep** — Semantic abstraction audit beyond fence-lite regex checks; see [FENCE-CHECKS.md](FENCE-CHECKS.md).
**adjudicate** — Issue a structured PASS / FAIL verdict with file paths, line references, and remediation.

## Branches

| Branch | When | Steps |
|---|---|---|
| **quick** | CI gate, pre-commit, "lint docs" | 1. sweep |
| **full** | PR review, periodic audit, post-authoring | 1. sweep → 2. fence-deep → 3. adjudicate |

Default to **full** when the user asks to audit documentation management. Use **quick** only when they explicitly want mechanical checks only.

## Steps

### 1. sweep (Mechanical validation)

Run governance lint from the repository root:

```bash
npm --prefix src run lint
```

Then run traceability graph checks:

```bash
./bin/traceweave check
```

Use `-d <docsDir>` when auditing a non-default docs tree. Add `--strict` to `./bin/traceweave check` when the user requests sufficiency enforcement.

Record every error and warning. Do not proceed to fence-deep while either command exits non-zero.

**Completion criterion**: Both commands exit 0, or every failure is captured with exact file/ID references for adjudication.

### 2. fence-deep (Semantic audit)

Read [FENCE-CHECKS.md](FENCE-CHECKS.md) and apply all eight checks to documents in scope:

- **Default scope**: all files under `docs/` with `status` not `deprecated` or `superseded`.
- **Narrow scope**: only added/modified docs when auditing a specific change set.

For each check, record PASS or FAIL with evidence (file path, section, quoted excerpt). Cross-check graph warnings from `./bin/traceweave check` (orphans, untested requirements) against check 8.

**Completion criterion**: Every check in FENCE-CHECKS.md is evaluated; every FAIL has a concrete citation.

### 3. adjudicate (Verdict)

Synthesize sweep and fence-deep into a report:

```markdown
## Documentation Governance Audit

**Verdict**: PASS | FAIL
**Branch**: quick | full
**Scope**: <paths or "all active docs">

### Mechanical (sweep)
- governance lint: PASS | FAIL (<N> errors)
- traceweave check: PASS | FAIL (<N> errors, <M> warnings)

### Semantic (fence-deep)
| # | Check | Result | Findings |
|---|-------|--------|----------|
| 1 | System boundary | PASS/FAIL | ... |
...

### Remediation
1. <actionable fix, highest severity first>
```

Verdict rules:
- **PASS**: sweep clean (or only acknowledged warnings) and zero fence-deep FAILs.
- **FAIL**: any mechanical error or any fence-deep FAIL.

**Completion criterion**: Report states PASS or FAIL unambiguously; every FAIL maps to a remediation item.

## Failure modes to avoid

- **Skipping sweep**: Issuing a semantic PASS without running deterministic validators.
- **Rubber-stamping fence-lite**: Approving because `validate-docs` passed while abstraction leaks remain in prose.
- **Scope drift**: Auditing retired (`deprecated` / `superseded`) docs as if active.
- **Premature completion**: Adjudicating before all eight fence-deep checks are evaluated.
