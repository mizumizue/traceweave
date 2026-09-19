import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { DocNode } from '../../core/models/types.js';
import { DocMtimeCache } from '../storage/DocMtimeCache.js';

export class DocParser {
  private cache: DocMtimeCache | null = null;
  private lastWarnings: string[] = [];

  constructor(cache?: DocMtimeCache) {
    this.cache = cache || null;
  }

  public getLastWarnings(): string[] {
    return [...this.lastWarnings];
  }

  /**
   * Converts a file path to a portable repository-relative path (using forward slashes)
   * to avoid leaking absolute local user profile paths into cache or serialized outputs.
   */
  public static toPortablePath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const docsIdx = normalized.lastIndexOf('/docs/');
    if (docsIdx !== -1) {
      return normalized.slice(docsIdx + 1);
    }
    if (normalized.startsWith('docs/')) {
      return normalized;
    }

    const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
      return rel;
    }
    const relFromParent = path.relative(path.resolve(process.cwd(), '..'), filePath).replace(/\\/g, '/');
    if (!relFromParent.startsWith('..') && !path.isAbsolute(relFromParent)) {
      return relFromParent;
    }

    return path.basename(filePath);
  }

  /**
   * Scans the docs directory and parses all Markdown files, using mtime cache if available.
   */
  public parseDirectory(docsDir: string): DocNode[] {
    this.lastWarnings = [];
    const nodes: DocNode[] = [];
    const validPaths = new Set<string>();

    if (!fs.existsSync(docsDir)) {
      return nodes;
    }

    const subdirs = fs.readdirSync(docsDir);
    for (const subdir of subdirs) {
      const fullSubdir = path.join(docsDir, subdir);
      if (!fs.statSync(fullSubdir).isDirectory()) continue;

      const files = fs.readdirSync(fullSubdir);
      for (const file of files) {
        if (!file.endsWith('.md') || file.startsWith('.')) continue;

        const filePath = path.join(fullSubdir, file);
        const normalizedPath = DocParser.toPortablePath(filePath);
        validPaths.add(normalizedPath);

        const stat = fs.statSync(filePath);
        const mtimeMs = Math.floor(stat.mtimeMs);

        // Try reading from cache
        if (this.cache) {
          const cached = this.cache.get(normalizedPath, mtimeMs);
          if (cached) {
            nodes.push(cached);
            continue;
          }
        }

        // Parse file
        const node = this.parseFile(filePath);
        if (node) {
          nodes.push(node);
          if (this.cache) {
            this.cache.set(normalizedPath, mtimeMs, node);
          }
        }
      }
    }

    // Prune removed files from cache
    if (this.cache) {
      this.cache.prune(validPaths);
    }

    return nodes;
  }

  public parseFile(filePath: string): DocNode | null {
    const portablePath = DocParser.toPortablePath(filePath);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(raw);
      const data = parsed.data;

      if (!data.id || !data.kind || !data.title) {
        this.lastWarnings.push(
          `${portablePath}: missing required frontmatter field (id, kind, or title)`
        );
        return null;
      }

      // Extract sections
      const sections: Record<string, string> = {};
      const content = parsed.content;
      const contentSplit = content.split(/^## Content\s*$/m);
      const body = contentSplit.length > 1 ? contentSplit.slice(1).join('## Content') : content;

      // Extract ### headings and content (ADR-0006: test_case keeps spec sections only).
      // Split by headings instead of regex lookahead: a blank line after `### Title` must not
      // yield an empty section (multiline `$` in the old regex stopped at the first line break).
      const testCaseSections = new Set(['Objective', 'Preconditions', 'Steps', 'Expected Results']);
      const headingBlocks = body.split(/^### /m).slice(1);
      for (const block of headingBlocks) {
        const newlineIdx = block.indexOf('\n');
        if (newlineIdx === -1) continue;
        const headingTitle = block.slice(0, newlineIdx).trim();
        if (data.kind === 'test_case' && !testCaseSections.has(headingTitle)) {
          continue;
        }
        sections[headingTitle] = block.slice(newlineIdx + 1).trim();
      }

      const execution_status = data.kind === 'test_case' ? 'pending' : data.execution_status || undefined;
      const actual_result = data.kind === 'test_case' ? undefined : data.actual_result || sections['Actual Results'] || undefined;
      const expected_result = sections['Expected Results'] || undefined;
      const objective = sections['Objective'] || undefined;
      const steps = sections['Steps'] || undefined;

      let parameters = undefined;
      if (data.parameter_file && typeof data.parameter_file === 'string') {
        const candidates = path.isAbsolute(data.parameter_file)
          ? [data.parameter_file]
          : [
              path.resolve(process.cwd(), data.parameter_file),
              path.resolve(path.dirname(filePath), '..', '..', data.parameter_file),
            ];
        const paramFilePath = candidates.find(candidate => fs.existsSync(candidate));
        if (paramFilePath) {
          try {
            parameters = JSON.parse(fs.readFileSync(paramFilePath, 'utf-8'));
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            this.lastWarnings.push(`${portablePath}: invalid parameter_file JSON (${data.parameter_file}): ${message}`);
          }
        }
      }

      const node: DocNode = {
        id: data.id,
        kind: data.kind,
        title: data.title,
        status: data.status || 'draft',
        created: String(data.created || ''),
        updated: String(data.updated || ''),
        scope: data.scope || 'local',
        criticality: data.criticality,
        requirement_class: data.requirement_class,
        test_level: data.test_level,
        test_method: data.test_method,
        execution_status,
        actual_result,
        expected_result,
        objective,
        steps,
        parameter_file: data.parameter_file,
        parameters,
        depends_on: Array.isArray(data.depends_on) ? data.depends_on : [],
        verifies: Array.isArray(data.verifies) ? data.verifies : undefined,
        actor_refs: Array.isArray(data.actor_refs) ? data.actor_refs : undefined,
        requirement_refs: Array.isArray(data.requirement_refs) ? data.requirement_refs : undefined,
        tags: Array.isArray(data.tags) ? data.tags : [],
        links: Array.isArray(data.links) ? data.links : [],
        glossary_scope: data.glossary_scope,
        glossary_domain: data.glossary_domain,
        filePath: DocParser.toPortablePath(filePath),
        content: parsed.content,
        sections,
      };

      return node;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.lastWarnings.push(`${portablePath}: parse error: ${message}`);
      return null;
    }
  }
}
