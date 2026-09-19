import fs from 'node:fs';
import path from 'node:path';

/** Pre-stratum serial keys (ADR-0009): TC-0001 … TC-9999 without stratum segment. */
const LEGACY_TEST_CASE_RESULT_KEY = /^TC-\d{4}$/;

function jsonFileHasLegacyTestCaseKeys(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { results?: Record<string, unknown> };
    return Object.keys(raw.results ?? {}).some(k => LEGACY_TEST_CASE_RESULT_KEY.test(k));
  } catch {
    return true;
  }
}

/**
 * Remove aggregate / suite fragments that still use legacy TC-xxxx result keys so merges
 * align with stratum IDs (TC-UT-0001, …) after ADR-0009 migration.
 */
export function dropLegacyTestResultArtifacts(options: {
  aggregatePath: string;
  suitesDir: string;
}): boolean {
  let dropped = false;

  if (jsonFileHasLegacyTestCaseKeys(options.aggregatePath)) {
    fs.unlinkSync(options.aggregatePath);
    dropped = true;
  }

  if (fs.existsSync(options.suitesDir)) {
    for (const name of fs.readdirSync(options.suitesDir)) {
      if (!name.endsWith('.json')) continue;
      const suitePath = path.join(options.suitesDir, name);
      if (jsonFileHasLegacyTestCaseKeys(suitePath)) {
        fs.unlinkSync(suitePath);
        dropped = true;
      }
    }
  }

  return dropped;
}
