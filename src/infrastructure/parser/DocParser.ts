import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { DocNode } from '../../core/models/types.js';
import { SQLiteCache } from '../storage/SQLiteCache.js';
import { TestCaseInputAnalyzer } from '../../core/analyzer/TestCaseInputAnalyzer.js';

export class DocParser {
  private cache: SQLiteCache | null = null;

  constructor(cache?: SQLiteCache) {
    this.cache = cache || null;
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
   * Scans the docs directory and parses all Markdown files, using SQLite cache if available.
   */
  public parseDirectory(docsDir: string): DocNode[] {
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
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(raw);
      const data = parsed.data;

      if (!data.id || !data.kind || !data.title) {
        return null;
      }

      // Extract sections
      const sections: Record<string, string> = {};
      const content = parsed.content;
      const contentSplit = content.split(/^## Content\s*$/m);
      const body = contentSplit.length > 1 ? contentSplit.slice(1).join('## Content') : content;

      // Extract ### headings and content
      const headingRegex = /^### ([^\r\n]+)\r?\n([\s\S]*?)(?=(?:^### [^\r\n]+)|$)/gm;
      let match;
      while ((match = headingRegex.exec(body)) !== null) {
        const headingTitle = match[1].trim();
        const headingBody = match[2].trim();
        sections[headingTitle] = headingBody;
      }

      const execution_status = data.execution_status || (data.kind === 'test_case' ? 'pending' : undefined);
      const actual_result = data.actual_result || sections['Actual Results'] || undefined;
      const expected_result = sections['Expected Results'] || undefined;
      const objective = sections['Objective'] || undefined;
      const steps = sections['Steps'] || undefined;

      let parameters = undefined;
      if (data.parameter_file && typeof data.parameter_file === 'string') {
        const paramFilePath = path.isAbsolute(data.parameter_file)
          ? data.parameter_file
          : path.resolve(process.cwd(), data.parameter_file);
        if (fs.existsSync(paramFilePath)) {
          try {
            parameters = JSON.parse(fs.readFileSync(paramFilePath, 'utf-8'));
          } catch {
            // ignore
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
        filePath: DocParser.toPortablePath(filePath),
        content: parsed.content,
        sections,
      };

      // Script-based deterministic analysis of test input modifiability
      if (node.kind === 'test_case') {
        node.inputAnalysis = TestCaseInputAnalyzer.analyze(node);
        node.ui_executable = node.inputAnalysis.isModifiable;
      }

      return node;
    } catch {
      return null;
    }
  }
}
