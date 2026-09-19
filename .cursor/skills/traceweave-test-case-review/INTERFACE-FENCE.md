# TC interface fence (mechanical)

Deterministic gate: `src/infrastructure/governance/tcInterfaceFence.ts` via `npm --prefix src run lint` → `[tc-interface-fence]` **errors**.

## Scoped sections

Only **Preconditions**, **Steps**, **Expected Results** on non-retired `test_case` with `test_level` ∈ `integration_internal`, `integration_external`, `system`, `acceptance`.

**Objective** may name the capability under test; do not copy Objective phrasing into Steps.

## Detected leaks (representative)

| Signal | Example |
|---|---|
| Implementation type suffix | `BalanceAnalyzer`, `TraceGraph` |
| Dotted call | `SufficiencyScorer.calculateAll` |
| Code-like backtick | `` `nodeId` ``, `` `execution_status` `` |
| Bare camelCase / snake_case | `testCaseId`, `requirement_class` |
| Automation | `mock`, `jest`, `tests/foo.test.ts`, `npm --prefix src test` |
| Strict equality in steps | `kind === 'requirement'` |

## Allowed

- Document IDs in backticks: `` `REQ-0001` ``, `` `TC-ITb-0001-01` ``
- Requirement class tokens: `` `functional` ``, `` `non_functional` ``
- **ITb+ only**: MCP tools `` `get_traceability_summary` ``, `` `check_quality_gaps` ``

## Authoring rewrite pattern

| Avoid | Prefer |
|---|---|
| `` `buildTraceWeaveReport` で `useCases` を得る `` | 統合レポートを生成し、ユースケース一覧を検査する |
| `` `TestRunnerRegistry.has` が false `` | テスト実行レジストリに登録されない |
| `` `metricSource: code_coverage` `` | 指標由来がコードカバレッジである |

## Review step

After **sweep**, any `[tc-interface-fence]` error on scoped ids → verdict cannot be **PASS** until lint is clean.
