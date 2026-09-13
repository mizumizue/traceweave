---
name: traceweave-test-fixture
description: Classify and isolate test data and fixtures across strata, balancing locality against sprawl. Use when authoring tests, deciding inline vs fixture placement, or refactoring test data.
---

# Test Fixture Design & Isolation

Classify and position test inputs, mocks, and fixtures to maximize locality of behavior (DAMP) while eliminating test sprawl and mystery guests.

## Leading words

**locality** — Cohesion of intent: preserve Arrange-Act-Assert within the test function so readers trace causes and effects without hopping files.
**mystery-guest** — Anti-pattern: avoid hiding key assertion parameters inside remote files where the reason for pass/fail becomes invisible.
**stratum-boundary** — Architectural cutoff: confine file-system trees, multi-document sets, and invalid payloads to external fixtures (`tests/fixtures/`).
**dataset-contract** — Product boundary: route interactive, data-driven parameter sets (REQ-0008) to `fixtures/test-cases/TC-xxxx.json` via `parameter_file`.

## Steps

### 1. classify (Determine placement target)

Examine the test target and data footprint against the **Placement Matrix**:
- **Pure unit / logic (UT)**: Keep objects inline in TypeScript. Preserve static typing and autocomplete.
- **Table-driven variants**: Place parameter tuples in a local array inside the test file.
- **File-system / multi-file integration (ITb / ST)**: Target `tests/fixtures/<domain>/`.
- **Interactive runtime execution (REQ-0008)**: Target `fixtures/test-cases/TC-xxxx.json`.

**Completion criterion**: The data placement for each test case matches exactly one target tier in the Placement Matrix.

### 2. isolate (Extract external fixtures)

When classified as an external fixture:
1. Create a focused directory under `tests/fixtures/<domain>/`.
2. Author minimal, deterministic files (Markdown documents, configuration JSON, or invalid syntax samples).
3. Eliminate hardcoded multiline string templates and repeated `fs.writeFileSync` calls from test scripts.

**Completion criterion**: Multiline string file payloads inside test scripts are replaced by static files under `tests/fixtures/`.

### 3. bind (Connect test script safely)

Connect test logic to fixtures using deterministic paths and isolated sandboxes:
1. Resolve paths with `repositoryPath('tests/fixtures/<domain>/...')`.
2. If tests mutate files (e.g. project adoption, file edits), copy fixtures into an OS temp directory (`fs.cpSync(fixtureDir, tempDir, { recursive: true })`) before execution.
3. Clean up temporary directories in `finally` or `afterEach` hooks.

**Completion criterion**: Tests reference fixtures via relative resolvers, source fixture directories remain read-only/immutable, and sandboxes are wiped after test completion.

### 4. verify (Execute and confirm cleanliness)

Execute the test suite and verify both assertion success and hygiene:
1. Run `npm --prefix src test`.
2. Confirm zero orphaned files or directories in working tree.

**Completion criterion**: Test suite exits with code 0, all assertions pass, and `git status` reports no untracked artifacts.

## Placement Matrix

| Stratum / Nature | Target Location | Rationale |
|---|---|---|
| **Unit / Logic (UT)** | **Inline** (test body) | Type safety, locality, immediate causal visibility |
| **Table-Driven Tests** | **Local array** (`const cases = [...]`) | Multi-case coverage without losing file cohesion |
| **File I/O / Docs Trees (ITb / ST)** | **`tests/fixtures/<domain>/`** | Multi-file directories, syntax error fixtures, CLI test trees |
| **Interactive Parameter Sets (REQ-0008)** | **`fixtures/test-cases/TC-xxxx.json`** | TraceWeave product contract for UI parameter editing |

## Directory Conventions

```text
tests/fixtures/
├── docs/                      # Static markdown document suites
│   ├── invalid-missing-link/  # Broken links, missing frontmatter for check CLI
│   ├── standalone-spec/       # Standalone specification/design docs without REQ
│   ├── storage/               # Sample docs for parser & SQLite cache tests
│   └── docparser-cache/       # Cache persistence integration fixtures
└── adopt/                     # Project adoption engine templates
    ├── sample-backend/        # Sample backend project with Jest
    └── legacy-root/           # Legacy root project with root configs
```

## Failure modes to avoid

- **Universal extraction**: Forcing pure in-memory test objects into external JSON files, destroying TypeScript compile-time type safety.
- **Mystery guest pollution**: Hiding values that directly affect assertions inside fixture files, making tests impossible to understand in isolation.
- **Mutable shared fixtures**: Allowing tests to write directly to files under `tests/fixtures/` without sandboxing via temp directories.
- **Premature completion**: Leaving test files or directories unverified or leaking temporary files across test runs.
