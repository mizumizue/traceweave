/**
 * One-shot migration: TC-NNNN → TC-<STRATUM>-NNNN per test_level, layer-local serial.
 * Run: node src/node_modules/tsx/dist/cli.mjs scripts/migrate-tc-ids-to-stratum.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  stratumCodeForTestLevel,
  type TestCaseStratumCode,
} from '../src/core/testing/testCaseId.js';
import type { TestLevel } from '../src/core/models/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const requireFromSrc = createRequire(path.join(ROOT, 'src', 'package.json'));

/** Runtime dep lives under `src/`; avoid `import('gray-matter')` (not on scripts' module graph). */
type GrayMatter = {
  (input: string): { content: string; data: Record<string, unknown> };
  stringify(content: string, data: Record<string, unknown>): string;
};
const matter = requireFromSrc('gray-matter') as GrayMatter;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'reports',
  'src/web/dist',
  '.traceweave-backup',
  'agent-logs',
]);

const TEXT_EXT = new Set([
  '.md',
  '.mdc',
  '.ts',
  '.tsx',
  '.json',
  '.mjs',
  '.yml',
  '.yaml',
]);

function listTcDocs(): { oldId: string; filePath: string; testLevel: TestLevel }[] {
  const dir = path.join(ROOT, 'docs', 'test-cases');
  const entries: { oldId: string; filePath: string; testLevel: TestLevel; num: number }[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(raw);
    const oldId = String(data.id ?? path.basename(file, '.md'));
    const match = oldId.match(/^TC-(\d+)$/);
    if (!match) {
      console.warn(`skip (not legacy id): ${oldId}`);
      continue;
    }
    const testLevel = data.test_level as TestLevel;
    if (!testLevel) {
      throw new Error(`${filePath}: missing test_level`);
    }
    entries.push({ oldId, filePath, testLevel, num: parseInt(match[1], 10) });
  }
  entries.sort((a, b) => a.num - b.num);
  return entries;
}

function buildMapping(
  docs: { oldId: string; testLevel: TestLevel }[]
): Map<string, string> {
  const counters: Record<TestCaseStratumCode, number> = {
    UT: 0,
    ITa: 0,
    ITb: 0,
    ST: 0,
    UAT: 0,
  };
  const map = new Map<string, string>();
  for (const doc of docs) {
    const code = stratumCodeForTestLevel(doc.testLevel);
    counters[code] += 1;
    const serial = String(counters[code]).padStart(4, '0');
    map.set(doc.oldId, `TC-${code}-${serial}`);
  }
  return map;
}

function walkFiles(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!TEXT_EXT.has(ext)) continue;
    out.push(full);
  }
}

function applyReplacements(content: string, map: Map<string, string>): string {
  let next = content;
  const olds = [...map.keys()].sort((a, b) => b.length - a.length);
  for (const oldId of olds) {
    const newId = map.get(oldId)!;
    next = next.split(oldId).join(newId);
  }
  return next;
}

function main(): void {
  const docs = listTcDocs();
  const map = buildMapping(docs);
  const mapPath = path.join(ROOT, 'scripts', 'migrate-tc-id-map.json');
  fs.writeFileSync(
    mapPath,
    JSON.stringify(Object.fromEntries(map), null, 2),
    'utf8'
  );
  console.log(`Mapping ${map.size} test cases → ${mapPath}`);

  for (const [oldId, newId] of map) {
    const oldPath = path.join(ROOT, 'docs', 'test-cases', `${oldId}.md`);
    const newPath = path.join(ROOT, 'docs', 'test-cases', `${newId}.md`);
    if (!fs.existsSync(oldPath)) continue;
    let raw = fs.readFileSync(oldPath, 'utf8');
    raw = applyReplacements(raw, map);
    const parsed = matter(raw);
    parsed.data.id = newId;
    const out = matter.stringify(parsed.content, parsed.data);
    fs.writeFileSync(newPath, out, 'utf8');
    if (oldPath !== newPath) {
      fs.unlinkSync(oldPath);
    }
  }

  const fixtureDir = path.join(ROOT, 'fixtures', 'test-cases');
  if (fs.existsSync(fixtureDir)) {
    for (const file of fs.readdirSync(fixtureDir)) {
      const m = file.match(/^(TC-\d{4})(\.json)$/);
      if (!m) continue;
      const oldId = m[1];
      const newId = map.get(oldId);
      if (!newId) continue;
      const oldPath = path.join(fixtureDir, file);
      let raw = fs.readFileSync(oldPath, 'utf8');
      raw = applyReplacements(raw, map);
      fs.writeFileSync(path.join(fixtureDir, `${newId}.json`), raw, 'utf8');
      fs.unlinkSync(oldPath);
    }
  }

  const files: string[] = [];
  walkFiles(ROOT, files);
  for (const file of files) {
    if (file.endsWith('migrate-tc-id-map.json')) continue;
    if (file.endsWith('migrate-tc-ids-to-stratum.ts')) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const updated = applyReplacements(raw, map);
    if (updated !== raw) {
      fs.writeFileSync(file, updated, 'utf8');
    }
  }

  const testFixtureTc = path.join(ROOT, 'tests', 'fixtures', 'docs');
  if (fs.existsSync(testFixtureTc)) {
    walkFiles(testFixtureTc, files);
    for (const file of files) {
      if (!file.includes('test-cases')) continue;
      const raw = fs.readFileSync(file, 'utf8');
      const updated = applyReplacements(raw, map);
      if (updated !== raw) fs.writeFileSync(file, updated, 'utf8');
      const base = path.basename(file, '.md');
      if (map.has(base)) {
        const newBase = map.get(base)!;
        const newPath = path.join(path.dirname(file), `${newBase}.md`);
        if (newPath !== file && fs.existsSync(file)) {
          fs.renameSync(file, newPath);
        }
      }
    }
  }

  console.log('Done. Run npm --prefix src run lint && npm --prefix src test');
}

main();
