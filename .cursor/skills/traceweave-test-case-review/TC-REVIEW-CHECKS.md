# Test Case Semantic Checks

Apply with `traceweave-test-case-review` step **scrutinize**. Mechanical gates: `tcInterfaceFence.ts` → `[tc-interface-fence]` errors (ADR-0012). Pattern catalog: [INTERFACE-FENCE.md](INTERFACE-FENCE.md). Reference: SPEC-0029, ADR-0010, `.cursor/rules/test-case-authoring.mdc`.

## 1. contract-surface

Preconditions, Steps, and Expected Results describe **who acts on which boundary** and **what is observable** (exit code, response body fields, UI text, artifact files).

- **PASS**: ITa+ executable sections read like a manual or contract test without opening `src/`; lint fence errors are zero.
- **FAIL**: Steps center on class names, JSON field names, fixtures paths, mocks, or runner commands.

Objective may name the capability under test; fence applies to the three executable sections.

## 2. atomic-oracle

One document yields **one independent pass/fail verdict**.

- **SPLIT** when Expected Results bullet groups map to disjoint scenarios (e.g. healthy vs inverted pyramid each with its own verdict).
- **PASS** when numbered steps are one scenario (login then submit then confirm) with one consolidated Expected.

Verdict tag for review output: **SPLIT** with a proposed child count and stratum.

## 3. split-lineage

When recommending SPLIT, specify:

1. Child IDs use **split suffix** on the parent base: `TC-ITb-0001-01`, `-02`, … (`SS` 01..99). Same `<NNNN>` as the parent so cases stay grouped.
2. Parent base id (no suffix) `status: deprecated`, `supersedes: [all children]`.
3. Each child `derived_from: <parent base id>` and `verifies` split per oracle.
4. Use a **new stratum serial only** when the scenario is not a split of an existing TC (unrelated new case).
5. Append `scripts/migrate-tc-id-map.json` if execution history must be explained.

Do not use letter suffixes (`0001a`) or single-digit suffixes (`-1`). Use `-01` .. `-99` only.

## 4. automation-boundary

TC prose must not duplicate test code structure (describe blocks, assertion API, tap titles).

- Automation mapping belongs in `tests/` and `test-writing-guidelines.mdc`.
- TC links to behavior; code links to TC id in the `test('TC-...')` declaration.

## 5. Leading-word cross-check

| Word | Question |
|---|---|
| oracle | Does Expected prove the REQ AC / SPEC contract, not an internal enum only? |
| feasibility | Can a human or black-box runner follow Steps without private hooks? |
| soundness | Do Preconditions make step 1 possible? |
| tautology | Expected independent of mock canned values? |
| stratum-fit | ITb uses external IF; not unit-level class tests labeled ITb |

## 6. Review output template

```markdown
## Verdict: PASS | REVISE | REDESIGN | RECLASSIFY | SPLIT

### Findings
- [contract-surface] ...
- [atomic-oracle] ...

### Remediation
- Exact section rewrites or split plan (parent id, child ids, supersedes).
```
