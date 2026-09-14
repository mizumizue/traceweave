import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDocs } from './validate-docs.js';
import { validateNoLocalPaths } from './validate-no-local-paths.js';
import { validateCleanRoot } from './validate-clean-root.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

export interface GovernanceLintResult {
  passed: boolean;
  docs: { passed: boolean; errorCount: number; errors: string[]; docCount: number };
  localPaths: { passed: boolean; findingCount: number; findings: string[] };
  cleanRoot: { passed: boolean; violationCount: number; violations: string[] };
}

export function runGovernanceLint(rootDir: string = ROOT): GovernanceLintResult {
  const docsResult = validateDocs(path.join(rootDir, 'docs'));
  const localPathsResult = validateNoLocalPaths(rootDir);
  const cleanRootResult = validateCleanRoot(rootDir);

  const docs = {
    passed: docsResult.passed,
    errorCount: docsResult.errors.length,
    errors: docsResult.errors,
    docCount: docsResult.docs.length,
  };

  const localPaths = {
    passed: localPathsResult.passed,
    findingCount: localPathsResult.findings.length,
    findings: localPathsResult.findings.map(
      (f) => `${f.filePath}:${f.lineNumber} — ${f.matchedText}`
    ),
  };

  const cleanRoot = {
    passed: cleanRootResult.passed,
    violationCount: cleanRootResult.violations.length,
    violations: cleanRootResult.violations.map(
      (v) => `${v.name} (${v.type}): ${v.reason}`
    ),
  };

  const passed = docs.passed && localPaths.passed && cleanRoot.passed;

  return { passed, docs, localPaths, cleanRoot };
}

function printResult(result: GovernanceLintResult): void {
  const { docs, localPaths, cleanRoot } = result;

  if (docs.passed) {
    console.log(
      `\x1b[32mPASS: schema (${docs.docCount} docs). fence-lite OK.\x1b[0m`
    );
  } else {
    console.error(`\x1b[31mFAIL: validate-docs — ${docs.errorCount} error(s)\x1b[0m`);
    for (const err of docs.errors) {
      console.error(`  - ${err}`);
    }
  }

  if (localPaths.passed) {
    console.log(`\x1b[32mPASS: no local path leaks\x1b[0m`);
  } else {
    console.error(
      `\x1b[31mFAIL: validate-no-local-paths — ${localPaths.findingCount} finding(s)\x1b[0m`
    );
    for (const finding of localPaths.findings) {
      console.error(`  - ${finding}`);
    }
  }

  if (cleanRoot.passed) {
    console.log(`\x1b[32mPASS: clean root\x1b[0m`);
  } else {
    console.error(
      `\x1b[31mFAIL: validate-clean-root — ${cleanRoot.violationCount} violation(s)\x1b[0m`
    );
    for (const violation of cleanRoot.violations) {
      console.error(`  - ${violation}`);
    }
  }

  if (result.passed) {
    console.log(`\x1b[32mPASS: governance lint OK. fence-deep: not_verified.\x1b[0m`);
  } else {
    console.error(`\x1b[31mFAIL: governance lint — fix mechanical errors before fence-deep audit.\x1b[0m`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('run-governance-lint.ts')) {
  const result = runGovernanceLint();
  printResult(result);
  process.exit(result.passed ? 0 : 1);
}
