import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTcIdCatalogSource } from '../src/core/testing/tcIdCatalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_TC = path.join(ROOT, 'docs', 'test-cases');
const OUT_FILE = path.join(ROOT, 'src', 'generated', 'traceweave-tc-ids.ts');

export function generateTcIdCatalog(rootDir: string = ROOT): { outPath: string; content: string } {
  const content = buildTcIdCatalogSource(path.join(rootDir, 'docs', 'test-cases'));
  const outPath = path.join(rootDir, 'src', 'generated', 'traceweave-tc-ids.ts');
  return { outPath, content };
}

export function writeTcIdCatalog(rootDir: string = ROOT): string {
  const { outPath, content } = generateTcIdCatalog(rootDir);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf8');
  return outPath;
}

export function checkTcIdCatalog(rootDir: string = ROOT): { ok: boolean; message?: string } {
  const { outPath, content } = generateTcIdCatalog(rootDir);
  if (!fs.existsSync(outPath)) {
    return { ok: false, message: `Missing ${path.relative(rootDir, outPath)}. Run: npm --prefix src run generate:tc-catalog` };
  }
  const existing = fs.readFileSync(outPath, 'utf8');
  if (existing !== content) {
    return {
      ok: false,
      message: `${path.relative(rootDir, outPath)} is stale. Run: npm --prefix src run generate:tc-catalog`,
    };
  }
  return { ok: true };
}

if (process.argv[1] && process.argv[1].endsWith('generate-tc-id-catalog.ts')) {
  const checkOnly = process.argv.includes('--check');
  if (checkOnly) {
    const result = checkTcIdCatalog();
    if (!result.ok) {
      console.error(`\x1b[31mFAIL: ${result.message}\x1b[0m`);
      process.exit(1);
    }
    console.log(`\x1b[32mPASS: TC ID catalog is up to date (${path.relative(ROOT, OUT_FILE)})\x1b[0m`);
    process.exit(0);
  }

  const outPath = writeTcIdCatalog();
  console.log(`Wrote ${path.relative(ROOT, outPath)} (${listCount()} entries)`);
}

function listCount(): number {
  return fs.readdirSync(DOCS_TC).filter(name => name.startsWith('TC-') && name.endsWith('.md')).length;
}
