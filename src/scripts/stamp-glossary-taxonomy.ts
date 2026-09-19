/**
 * Adds glossary_scope / glossary_domain to all GLO frontmatter.
 * Run: npm --prefix src exec -- tsx scripts/stamp-glossary-taxonomy.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { resolveGlossaryTaxonomy } from '../core/models/glossaryTaxonomy.js';
import { resolveRepoRoot } from '../infrastructure/system/resolveRepoRoot.js';

const GLOSSARY_DIR = path.join(resolveRepoRoot(import.meta.url), 'docs', 'glossary');

function parseTagsLine(frontmatter: string): string[] {
  const match = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function stampContent(raw: string, id: string, tags: string[]): string {
  const { glossary_scope, glossary_domain } = resolveGlossaryTaxonomy(id, tags);
  const scopeLine = `glossary_scope: ${glossary_scope}`;
  const domainLine = `glossary_domain: ${glossary_domain}`;

  if (/^glossary_scope:/m.test(raw)) {
    return raw
      .replace(/^glossary_scope:.*$/m, scopeLine)
      .replace(/^glossary_domain:.*$/m, domainLine);
  }

  return raw.replace(/^(depends_on: \[\])\r?\n/m, `$1\n${scopeLine}\n${domainLine}\n`);
}

function main(): void {
  for (const file of fs.readdirSync(GLOSSARY_DIR).sort()) {
    if (!file.startsWith('GLO-') || !file.endsWith('.md')) continue;
    const filePath = path.join(GLOSSARY_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const idMatch = raw.match(/^id:\s*(GLO-\d+)/m);
    const id = idMatch?.[1] ?? file.replace('.md', '');
    const fmEnd = raw.indexOf('\n---\n', 4);
    const frontmatter = fmEnd >= 0 ? raw.slice(0, fmEnd) : raw;
    const tags = parseTagsLine(frontmatter);
    const next = stampContent(raw, id, tags);
    fs.writeFileSync(filePath, next.endsWith('\n') ? next : `${next}\n`, 'utf-8');
    const { glossary_scope, glossary_domain } = resolveGlossaryTaxonomy(id, tags);
    console.log(`${id} -> ${glossary_scope} / ${glossary_domain}`);
  }
}

main();
