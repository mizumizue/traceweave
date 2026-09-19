import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateDocs } from '../../scripts/validate-docs.js';

function writeMinimalSpecification(docsDir: string, reqId = 'REQ-0001'): void {
  const specDir = path.join(docsDir, 'specifications');
  fs.mkdirSync(specDir, { recursive: true });
  fs.writeFileSync(
    path.join(specDir, 'SPEC-0001.md'),
    `---
schema_version: 3
id: SPEC-0001
kind: specification
title: Sample specification
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
depends_on: [${reqId}]
tags: [test]
links: []
---
## Content

### Contract
Sample contract.

### Inputs
None.

### Outputs
Success.

### Errors
None.

### Constraints
None.
`,
    'utf8'
  );
}

function writeMinimalDesign(docsDir: string): void {
  const designDir = path.join(docsDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(
    path.join(designDir, 'DSN-0001.md'),
    `---
schema_version: 3
id: DSN-0001
kind: design
title: Sample design
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
depends_on: [SPEC-0001]
tags: [test]
links: []
---
## Content

### Decision
Sample decision.

### Structure
Sample structure.

### Data Flow
Input to output.

### Trade-offs
None.
`,
    'utf8'
  );
}

function writeMinimalRequirement(docsDir: string): void {
  const reqDir = path.join(docsDir, 'requirements');
  fs.mkdirSync(reqDir, { recursive: true });
  fs.writeFileSync(
    path.join(reqDir, 'REQ-0001.md'),
    `---
schema_version: 3
id: REQ-0001
kind: requirement
title: Sample requirement
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
depends_on: []
tags: [test]
links: []
requirement_class: functional
---
## Content

### Statement
Sample statement.

### Acceptance Criteria
- AC-001: Given sample When action Then result.
`,
    'utf8'
  );
}

function writeTestCaseWithForbiddenSection(
  docsDir: string,
  forbiddenHeading: string,
  sectionBody: string
): void {
  const tcDir = path.join(docsDir, 'test-cases');
  fs.mkdirSync(tcDir, { recursive: true });
  fs.writeFileSync(
    path.join(tcDir, 'TC-UT-0001.md'),
    `---
schema_version: 3
id: TC-UT-0001
kind: test_case
title: Sample TC
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
test_level: unit
test_method: unit_mock
verifies: [REQ-0001]
depends_on: []
tags: [unit]
links: []
---
## Content

### Objective
Verify something.

### Preconditions
Ready.

### Steps
1. Run.

### Expected Results
Pass.

${forbiddenHeading}
${sectionBody}
`,
    'utf8'
  );
}

/**
 * 【テスト概要】
 * - 対象: validateDocs (test_case 本文の禁止セクション検査)
 * - 条件: ## Content 以下に ADR-0006 で廃止された ### Actual Results を含む TC フィクスチャを検証
 * - 期待結果: passed: false となり、ADR-0006 を参照する禁止セクションエラーが返ること
 * - 関連文書: ADR-0006, REQ-0007
 */
test('validateDocs - test_case 本文の ### Actual Results セクションが ADR-0006 違反として拒否されること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-tc-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalRequirement(docsDir);
    writeTestCaseWithForbiddenSection(docsDir, '### Actual Results', 'Return value was true.');

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some(
        (err) => err.includes('Actual Results') && err.includes('ADR-0006')
      ),
      `Expected ADR-0006 Actual Results error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (test_case 本文の禁止セクション検査)
 * - 条件: ## Content 以下に ADR-0006 で廃止された ### Evidence を含む TC フィクスチャを検証
 * - 期待結果: passed: false となり、ADR-0006 を参照する禁止セクションエラーが返ること
 * - 関連文書: ADR-0006, REQ-0007
 */
test('validateDocs - test_case 本文の ### Evidence セクションが ADR-0006 違反として拒否されること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-tc-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalRequirement(docsDir);
    writeTestCaseWithForbiddenSection(docsDir, '### Evidence', 'Log outputs confirmed.');

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some(
        (err) => err.includes('Evidence') && err.includes('ADR-0006')
      ),
      `Expected ADR-0006 Evidence error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

function writeMinimalNeedWithDesiredOutcome(docsDir: string, desiredOutcome: string): void {
  const needDir = path.join(docsDir, 'needs');
  fs.mkdirSync(needDir, { recursive: true });
  fs.writeFileSync(
    path.join(needDir, 'NEED-0001.md'),
    `---
schema_version: 3
id: NEED-0001
kind: need
title: Sample need
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
depends_on: []
tags: [test]
links: []
---
## Content

### Background
Background.

### Problem
Problem.

### Desired Outcome
${desiredOutcome}
`,
    'utf8'
  );
}

function writeRequirementWithAc(docsDir: string, statement: string, acLine: string): void {
  const reqDir = path.join(docsDir, 'requirements');
  fs.mkdirSync(reqDir, { recursive: true });
  fs.writeFileSync(
    path.join(reqDir, 'REQ-0001.md'),
    `---
schema_version: 3
id: REQ-0001
kind: requirement
title: Sample requirement
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
depends_on: []
tags: [test]
links: []
requirement_class: functional
---
## Content

### Statement
${statement}

### Acceptance Criteria
${acLine}
`,
    'utf8'
  );
}

/**
 * 【テスト概要】
 * - 対象: validateDocs (NEED Desired Outcome の fence-lite 検査)
 * - 条件: Desired Outcome に実装ライブラリ名 `sonner` を含む NEED フィクスチャを検証
 * - 期待結果: passed: false となり、implementation artifacts エラーが返ること
 */
test('validateDocs - NEED の Desired Outcome に実装名がある場合は fence-lite 違反となること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-need-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalNeedWithDesiredOutcome(docsDir, 'Integrate `sonner` for toast feedback.');

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some((err) => err.includes('implementation artifacts') && err.includes('sonner')),
      `Expected need fence-lite error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (NEED Problem セクションの fence-lite 検査)
 * - 条件: Problem に実装コンポーネント名 `VisualTestPyramid` を含む NEED フィクスチャを検証
 * - 期待結果: passed: false となり、implementation artifacts エラーが返ること
 */
test('validateDocs - NEED の Problem セクションに実装名がある場合は fence-lite 違反となること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-need-problem-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    const needDir = path.join(docsDir, 'needs');
    fs.mkdirSync(needDir, { recursive: true });
    fs.writeFileSync(
      path.join(needDir, 'NEED-0001.md'),
      `---
schema_version: 3
id: NEED-0001
kind: need
title: Sample need
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
depends_on: []
tags: [test]
links: []
---
## Content

### Background
Background.

### Problem
Missing \`VisualTestPyramid\` visualization.

### Desired Outcome
Outcome without code names.
`,
      'utf8'
    );

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some(
        (err) => err.includes('implementation artifacts') && err.includes('VisualTestPyramid')
      ),
      `Expected need Problem fence-lite error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (NEED Problem セクションの許容トークン)
 * - 条件: Problem にスキーマフィールド名 `depends_on` を含む NEED フィクスチャを検証
 * - 期待結果: passed: true となり、スキーマトークンは誤検知されないこと
 */
test('validateDocs - NEED の Problem にスキーマフィールド名がある場合は fence-lite を通過すること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-need-schema-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    const needDir = path.join(docsDir, 'needs');
    fs.mkdirSync(needDir, { recursive: true });
    fs.writeFileSync(
      path.join(needDir, 'NEED-0001.md'),
      `---
schema_version: 3
id: NEED-0001
kind: need
title: Sample need
status: accepted
created: "2026-09-12"
updated: "2026-09-12"
scope: local
depends_on: []
tags: [test]
links: []
---
## Content

### Background
Background.

### Problem
Links use \`depends_on\` and \`verifies\`.

### Desired Outcome
Navigate related documents.
`,
      'utf8'
    );

    const result = validateDocs(docsDir);
    assert.equal(result.passed, true, result.errors.join(', '));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (REQ の fence-lite 検査)
 * - 条件: AC にピクセル寸法 1920px を含む REQ フィクスチャを検証
 * - 期待結果: passed: false となり、observable outcomes エラーが返ること
 */
test('validateDocs - REQ の AC にピクセル寸法がある場合は fence-lite 違反となること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-req-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeRequirementWithAc(
      docsDir,
      'Show a graph.',
      '- AC-001: Given graph When view Then width is 1920px.'
    );

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some((err) => err.includes('observable outcomes') && err.includes('1920px')),
      `Expected requirement fence-lite error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (REQ の CLI サブコマンド fence-lite 検査)
 * - 条件: AC に `traceweave check` 呼び出しを含む REQ フィクスチャを検証
 * - 期待結果: passed: false となり、CLI subcommand エラーが返ること
 */
test('validateDocs - REQ に CLI サブコマンド呼び出しがある場合は fence-lite 違反となること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-req-cli-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeRequirementWithAc(
      docsDir,
      'Provide CLI.',
      '- AC-001: Given docs When traceweave check runs Then exit code is 0.'
    );

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some(
        (err) => err.includes('observable outcomes') && err.includes('CLI subcommand')
      ),
      `Expected CLI fence-lite error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (REQ の SPEC カバレッジ検査)
 * - 条件: 有効な REQ のみを置き、どの SPEC も depends_on で参照しないフィクスチャを検証
 * - 期待結果: passed: true のまま、孤児 REQ の Coverage gap 警告が返ること
 */
test('validateDocs - 有効な REQ がどの SPEC からも depends_on されない場合は孤児として警告されること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-orphan-req-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalRequirement(docsDir);

    const result = validateDocs(docsDir);
    assert.equal(result.passed, true);
    assert.ok(
      result.warnings.some((warn) =>
        warn.includes('Coverage gap: Active requirement "REQ-0001" has no matching specification (SPEC-) depending on it.')
      ),
      `Expected orphan REQ coverage warning, got errors=[${result.errors.join(', ')}] warnings=[${result.warnings.join(', ')}]`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (REQ の SPEC カバレッジ検査)
 * - 条件: REQ と SPEC.depends_on [REQ-0001]、および DSN を揃えた最小フィクスチャを検証
 * - 期待結果: 孤児 REQ の Coverage gap エラーが発生しないこと
 */
test('validateDocs - 有効な REQ が SPEC の depends_on で参照されている場合は孤児扱いにならないこと', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-docs-covered-req-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalRequirement(docsDir);
    writeMinimalSpecification(docsDir);
    writeMinimalDesign(docsDir);

    const result = validateDocs(docsDir);
    assert.ok(
      !result.warnings.some((warn) => warn.includes('Coverage gap: Active requirement "REQ-0001"')),
      `Unexpected orphan REQ coverage warning: ${result.warnings.join(', ')}`
    );
    assert.equal(result.passed, true, `Validation failed with errors: ${result.errors.join(', ')}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

function writeMinimalItbTestCase(
  docsDir: string,
  opts: { steps: string; status?: string; supersedes?: string[] }
): void {
  const tcDir = path.join(docsDir, 'test-cases');
  fs.mkdirSync(tcDir, { recursive: true });
  const supersedesYaml =
    opts.supersedes && opts.supersedes.length > 0
      ? `supersedes: [${opts.supersedes.map((id) => id).join(', ')}]\n`
      : '';
  fs.writeFileSync(
    path.join(tcDir, 'TC-ITb-0001.md'),
    `---
schema_version: 3
id: TC-ITb-0001
kind: test_case
title: Sample ITb TC
status: ${opts.status ?? 'accepted'}
created: "2026-09-12"
updated: "2026-09-12"
scope: local
test_level: integration_external
test_method: api_contract
verifies: [REQ-0001]
depends_on: []
tags: [integration]
links: []
${supersedesYaml}---
## Content

### Objective
Verify CLI behavior.

### Preconditions
Server is running.

### Steps
${opts.steps}

### Expected Results
Exit code 0.
`,
    'utf8'
  );
}

/**
 * 【テスト概要】
 * - 対象: validateDocs (TC 退役時の supersedes 必須)
 * - 条件: status deprecated で supersedes 未設定の ITb TC
 * - 期待結果: ADR-0010 を参照するエラーが返ること
 */
test('validateDocs - 退役 test_case に supersedes が無い場合はエラーとなること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-tc-lineage-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalRequirement(docsDir);
    writeMinimalSpecification(docsDir);
    writeMinimalDesign(docsDir);
    writeMinimalItbTestCase(docsDir, { steps: '1. Run CLI.', status: 'deprecated' });

    const result = validateDocs(docsDir);
    assert.equal(result.passed, false);
    assert.ok(
      result.errors.some((err) => err.includes('supersedes') && err.includes('ADR-0010')),
      `Expected supersedes error, got: ${result.errors.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 【テスト概要】
 * - 対象: validateDocs (TC interface fence 警告)
 * - 条件: ITb の Steps に実装型名を含む TC
 * - 期待結果: [tc-interface-fence] 警告が返り lint は passed のままであること
 */
test('validateDocs - ITb の Steps に実装型名がある場合は tc-interface-fence 警告となること', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-validate-tc-fence-'));
  try {
    const docsDir = path.join(tempDir, 'docs');
    writeMinimalRequirement(docsDir);
    writeMinimalSpecification(docsDir);
    writeMinimalDesign(docsDir);
    writeMinimalItbTestCase(docsDir, {
      steps: '1. Read fixtures/test-cases/sample.json and pass rows to the service.',
    });

    const result = validateDocs(docsDir);
    assert.equal(result.passed, true, `Unexpected errors: ${result.errors.join(', ')}`);
    assert.ok(
      result.warnings.some((warn) => warn.includes('[tc-interface-fence]')),
      `Expected tc-interface-fence warning, got: ${result.warnings.join(', ')}`
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
