---
name: traceweave-test-case-review
description: Audit test cases (TC) for oracle validity, interface-style prose, atomicity, split lineage, and stratum fit against REQ/SPEC. Use when reviewing test cases, auditing tests, splitting oversized TCs, or verifying testability.
---

# Test Case Review

Audit `docs/test-cases/TC-*.md` and linked automation against upstream `REQ-` / `SPEC-`. Contract rules: SPEC-0029, ADR-0010, ADR-0012, `.cursor/rules/test-case-authoring.mdc`.

**Subagent:** spawn `traceweave-test-case-reviewer` for read-only batch audits. Parent applies fixes.

## Leading words

**oracle** — Expected results prove behavioral outcomes and contract states, not hollow status or internal enums alone.
**feasibility** — Preconditions and steps are observable via public interfaces without private hacks or brittle timing.
**soundness** — Given-When-Then has no logical contradictions.
**tautology** — Mocks are not echo chambers; tests do not re-implement production logic for expected values.
**stratum-fit** — Scenario matches `test_level` and `test_method`.
**contract-surface** — Preconditions, Steps, and Expected describe observables (CLI, HTTP, UI, artifacts, internal contract outcomes), not classes, property names, fixtures-as-steps, or runner jargon (ITa+). Mechanical patterns: [INTERFACE-FENCE.md](INTERFACE-FENCE.md).
**atomic-oracle** — One TC document, one independent pass/fail verdict; multiple verdicts imply **SPLIT** (ADR-0010).
**split-lineage** — Split children use `TC-<STRATUM>-<NNNN>-<SS>` on the parent base; parent `supersedes`; child `derived_from`; new stratum serial only for non-split cases.

## Steps

### 1. align (Map upstream verification targets)

Read the target `TC-*.md` and every `verifies` document.

1. Extract AC lines from each `REQ-`.
2. Extract contract clauses from each `SPEC-`.
3. Map each step and expected result to upstream criteria.

**Completion criterion:** Every step and expected maps to upstream criteria, or unmapped actions are listed.

### 2. sweep (Mechanical gates)

```bash
npm --prefix src run lint
```

Capture `[tc-interface-fence]` **errors** and lineage errors for the target TC ids. Lint must exit 0 before **PASS**.

**Completion criterion:** Zero fence errors on scoped ids; lineage errors noted; residual semantic contract-surface gaps listed for **REVISE**.

### 3. scrutinize (Semantic audit)

Read [TC-REVIEW-CHECKS.md](TC-REVIEW-CHECKS.md). Evaluate all eight checks (five legacy leading words plus contract-surface, atomic-oracle, split-lineage).

**Completion criterion:** Each check has PASS, FAIL, or SPLIT with evidence (path, section, quote).

### 4. adjudicate (Verdict)

- **PASS** — All checks satisfied.
- **REVISE** — Rewrite Steps / Expected / Preconditions (provide Markdown replacements).
- **SPLIT** — Multiple atomic-oracle failures; include parent retirement, child id plan, `supersedes` / `derived_from`, migrate-map note.
- **REDESIGN** — Infeasible without a DSN seam or SPEC interface change.
- **RECLASSIFY** — Wrong `test_level` or `test_method`.

Use the report template in TC-REVIEW-CHECKS section 6.

**Completion criterion:** Verdict plus remediation explicit enough for another author to execute without guessing.

## Failure modes to avoid

- **Superficial approval** — Headings match schema but assertions are hollow.
- **Automation-shaped TC** — TC reads like a unit test file; fails contract-surface on ITb+.
- **Mega-TC tolerance** — Multiple independent scenarios in one id; fails atomic-oracle.
- **Wrong split shape** — Letter suffixes (`0001a`), single-digit `-1`, or new stratum serial when split suffix was required (ADR-0010).
- **Premature completion** — Verdict before upstream REQ/SPEC cross-read.
