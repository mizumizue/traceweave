import fs from 'node:fs';
import path from 'node:path';
import { DocNode } from '../../core/models/types.js';

interface CacheEntry {
  mtimeMs: number;
  node: DocNode;
}

/** mtime-keyed parse cache. Optional JSON file persistence replaces SQLite. */
export class DocMtimeCache {
  private entries = new Map<string, CacheEntry>();
  private persistPath: string | null;

  constructor(cachePath: string = ':memory:') {
    this.persistPath = cachePath === ':memory:' ? null : cachePath;
    if (this.persistPath) {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.persistPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(this.persistPath, 'utf-8')) as Record<string, CacheEntry>;
          for (const [key, entry] of Object.entries(raw)) {
            this.entries.set(key, entry);
          }
        } catch {
          // ponytail: corrupt cache file — start fresh
        }
      }
    }
  }

  private isStaleNode(node: DocNode): boolean {
    if (node.kind === 'requirement' && node.requirement_class === undefined) {
      return true;
    }
    if (
      node.sections &&
      Object.keys(node.sections).length > 0 &&
      Object.values(node.sections).every(value => !value?.trim()) &&
      node.content.includes('### ')
    ) {
      return true;
    }
    return false;
  }

  public get(filePath: string, mtimeMs: number): DocNode | null {
    const entry = this.entries.get(filePath);
    if (!entry || entry.mtimeMs !== mtimeMs) return null;
    if (this.isStaleNode(entry.node)) return null;
    return entry.node;
  }

  public set(filePath: string, mtimeMs: number, node: DocNode): void {
    this.entries.set(filePath, { mtimeMs, node });
  }

  public prune(validPaths: Set<string>): void {
    for (const key of this.entries.keys()) {
      if (!validPaths.has(key)) {
        this.entries.delete(key);
      }
    }
  }

  public count(): number {
    return this.entries.size;
  }

  public close(): void {
    if (!this.persistPath) return;
    const serialized: Record<string, CacheEntry> = {};
    for (const [key, entry] of this.entries) {
      serialized[key] = entry;
    }
    fs.writeFileSync(this.persistPath, JSON.stringify(serialized));
  }
}
