---
name: test-case-review
description: Audit test cases (TC) against REQ and SPEC for oracle validity, execution feasibility, logical soundness, and stratum fit. Use when reviewing test cases, auditing tests, or verifying testability.
---

# Test Case Review

Audit test cases (`docs/test-cases/TC-xxxx.md` and associated test scripts) against upstream requirements (`REQ-`) and specifications (`SPEC-`) to guarantee genuine, sound, and feasible verification suites.

## Leading words

**oracle** — True verification target: ensure expected results verify genuine behavioral outcomes and contract states, rather than superficial status codes or empty assertions.
**feasibility** — Black-box testability: verify that preconditions and actions are deterministically observable without invasive private hacks, brittle sleeps, or environmental coupling.
**soundness** — Causal integrity: verify that the Given-When-Then progression contains zero logical contradictions or impossible state transitions.
**tautology** — Anti-echo: eliminate self-fulfilling tests where mocks assert their own canned return values or tests mirror internal implementation algorithms.
**stratum-fit** — Layer alignment: verify that the scenario belongs to its designated `test_level` (`unit`, `integration_internal`, `integration_external`, `system`, `acceptance`) and `test_method`.

## Steps

### 1. align (Map upstream verification targets)

Read the target `TC-xxxx.md` and every upstream document listed in its `verifies` frontmatter array:
1. Extract acceptance criteria (`- AC-xxx: Given ... When ... Then ...`) from each verified `REQ-`.
2. Extract input preconditions, output guarantees, error conditions, and constraints from each verified `SPEC-`.
3. Construct a trace matrix matching each TC step and expected result to an upstream criterion.

**Completion criterion**: Every step and expected result in the TC maps directly to at least one upstream AC or SPEC contract clause. Any unmapped test action is identified.

### 2. scrutinize (Audit against the five leading words)

Evaluate the mapped verification steps against all five criteria:
1. **oracle**:
   - Does `Expected Results` prove the user-observable outcome (What) defined in the REQ's AC?
   - Does it verify output schemas, error codes, and state mutations defined in SPEC?
   - Reject any assertion that passes unconditionally or tests trivialities (e.g., asserting an object is defined without checking contents).
2. **feasibility**:
   - Are preconditions setup-able through public interfaces or realistic fixtures?
   - Reject artificial force: accessing private variables, mocking language built-ins to simulate unreachable states, or sleeping for arbitrary timeouts.
   - If testability is blocked, demand a design seam in `DSN-` rather than forcing a fragile test.
3. **soundness**:
   - Check the causal chain: Does Given establish the state required for When? Does When trigger the exact effect evaluated by Then?
   - Flag logical contradictions (e.g., asserting data modification when preconditions state the entity does not exist).
4. **tautology**:
   - Are mocks serving as echo chambers (e.g., mock returns X, test asserts result is X without system transformation)?
   - Does test code re-implement production business logic to compute the expected value?
5. **stratum-fit**:
   - Verify alignment with `docs-document-schema.mdc`:
     - `unit`: Pure in-memory components, mocks for external I/O.
     - `integration_internal`: Real intra-system boundaries (e.g., Parser + GraphBuilder).
     - `integration_external`: Inter-system boundaries, file system, CLI execution.
     - `system` / `acceptance`: End-to-end scenarios from actor entrypoints.
   - Reject bloated unit tests doing full system wiring, or system tests validating micro-level algorithms.

**Completion criterion**: Every step is evaluated against all five criteria, with concrete evidence recorded for each finding.

### 3. adjudicate (Issue actionable verdict)

Synthesize findings into an explicit verdict:
- **PASS**: All steps satisfy `oracle`, `feasibility`, `soundness`, `tautology`, and `stratum-fit`.
- **REVISE**: Logic or oracle defects detected. Provide exact Markdown/code replacement diffs for `Steps`, `Expected Results`, or assertions.
- **REDESIGN**: Test is infeasible due to lack of observability. Detail the architectural seam needed in `DSN-` or interface update needed in `SPEC-`.
- **RECLASSIFY**: `test_level` or `test_method` mismatches the actual scope. Specify the correct classification.

**Completion criterion**: A structured report containing verdict, mapped matrix, and exact remediation instructions.

## Failure modes to avoid

- **Superficial approval**: Rubber-stamping tests because headings and formatting match schema, while ignoring hollow assertions.
- **Tolerating forced tests**: Permitting tests that patch private properties or rely on non-deterministic timing instead of requesting testability seams.
- **Echo-chamber mocks**: Accepting tests where mocks verify only that mocks were called, without asserting system contracts.
- **Premature completion**: Issuing a verdict before cross-referencing every referenced upstream `REQ-` and `SPEC-`.
