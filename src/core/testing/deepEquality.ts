/**
 * Deep equality for test runner expected/actual comparison.
 */
export function deepEqual(actual: unknown, expected: unknown, path = '', diffs: string[] = []): boolean {
  if (actual === expected) return true;

  const label = path || 'root';

  if (actual === null || actual === undefined || expected === null || expected === undefined) {
    diffs.push(`${label}: 期待値=${JSON.stringify(expected)} に対し 実測値=${JSON.stringify(actual)}`);
    return false;
  }

  if (typeof expected !== typeof actual) {
    diffs.push(`${label}: 型不一致 期待値型(${typeof expected}) !== 実測値型(${typeof actual})`);
    return false;
  }

  if (typeof expected !== 'object') {
    if (actual !== expected) {
      diffs.push(`${label}: 期待値=${JSON.stringify(expected)} に対し 実測値=${JSON.stringify(actual)}`);
      return false;
    }
    return true;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      diffs.push(`${label}: 期待値は配列ですが実測値は非配列です`);
      return false;
    }
    if (actual.length !== expected.length) {
      diffs.push(`${label}: 配列長不一致 期待値長=${expected.length} に対し 実測値長=${actual.length}`);
      return false;
    }
    let match = true;
    for (let i = 0; i < expected.length; i++) {
      if (!deepEqual(actual[i], expected[i], `${path}[${i}]`, diffs)) {
        match = false;
      }
    }
    return match;
  }

  let match = true;
  for (const key of Object.keys(expected as Record<string, unknown>)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (!(key in (actual as Record<string, unknown>))) {
      diffs.push(`${currentPath}: 実測値に対象キー "${key}" が存在しません`);
      match = false;
    } else if (!deepEqual((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], currentPath, diffs)) {
      match = false;
    }
  }

  return match;
}
