export { validateDocs, type DocItem } from '../src/infrastructure/governance/validateDocs.js';

import { validateDocs } from '../src/infrastructure/governance/validateDocs.js';

if (process.argv[1] && process.argv[1].endsWith('validate-docs.ts')) {
  const result = validateDocs();
  if (!result.passed) {
    console.error(`\x1b[31mFAIL: ${result.errors.length} validation error(s) found:\x1b[0m`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  } else {
    console.log(
      `\x1b[32mPASS: schema OK (${result.docs.length} docs). fence-lite OK. fence-deep: not_verified.\x1b[0m`
    );
    if (result.warnings.length > 0) {
      console.warn(`\x1b[33mWARN: ${result.warnings.length} warning(s):\x1b[0m`);
      for (const warn of result.warnings) {
        console.warn(`  - ${warn}`);
      }
    }
    process.exit(0);
  }
}
