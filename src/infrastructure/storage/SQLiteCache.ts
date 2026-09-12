import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { DocNode } from '../../core/models/types.js';

export class SQLiteCache {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS doc_cache (
        path TEXT PRIMARY KEY,
        mtime_ms INTEGER NOT NULL,
        id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        criticality TEXT,
        test_level TEXT,
        test_method TEXT,
        depends_on_json TEXT NOT NULL,
        verifies_json TEXT,
        node_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_doc_cache_id ON doc_cache(id);
      CREATE INDEX IF NOT EXISTS idx_doc_cache_kind ON doc_cache(kind);
    `);
  }

  public get(filePath: string, mtimeMs: number): DocNode | null {
    const row = this.db
      .prepare('SELECT node_json, mtime_ms FROM doc_cache WHERE path = ?')
      .get(filePath) as { node_json: string; mtime_ms: number } | undefined;

    if (!row) return null;
    if (row.mtime_ms !== mtimeMs) return null;

    try {
      return JSON.parse(row.node_json) as DocNode;
    } catch {
      return null;
    }
  }

  public set(filePath: string, mtimeMs: number, node: DocNode): void {
    const stmt = this.db.prepare(`
      INSERT INTO doc_cache (
        path, mtime_ms, id, kind, title, status, criticality,
        test_level, test_method, depends_on_json, verifies_json, node_json, updated_at
      ) VALUES (
        @path, @mtime_ms, @id, @kind, @title, @status, @criticality,
        @test_level, @test_method, @depends_on_json, @verifies_json, @node_json, @updated_at
      )
      ON CONFLICT(path) DO UPDATE SET
        mtime_ms = excluded.mtime_ms,
        id = excluded.id,
        kind = excluded.kind,
        title = excluded.title,
        status = excluded.status,
        criticality = excluded.criticality,
        test_level = excluded.test_level,
        test_method = excluded.test_method,
        depends_on_json = excluded.depends_on_json,
        verifies_json = excluded.verifies_json,
        node_json = excluded.node_json,
        updated_at = excluded.updated_at
    `);

    stmt.run({
      path: filePath,
      mtime_ms: mtimeMs,
      id: node.id,
      kind: node.kind,
      title: node.title,
      status: node.status,
      criticality: node.criticality || null,
      test_level: node.test_level || null,
      test_method: node.test_method || null,
      depends_on_json: JSON.stringify(node.depends_on || []),
      verifies_json: JSON.stringify(node.verifies || []),
      node_json: JSON.stringify(node),
      updated_at: new Date().toISOString(),
    });
  }

  public delete(filePath: string): void {
    this.db.prepare('DELETE FROM doc_cache WHERE path = ?').run(filePath);
  }

  public prune(validPaths: Set<string>): void {
    const rows = this.db.prepare('SELECT path FROM doc_cache').all() as { path: string }[];
    const deleteStmt = this.db.prepare('DELETE FROM doc_cache WHERE path = ?');
    for (const row of rows) {
      if (!validPaths.has(row.path)) {
        deleteStmt.run(row.path);
      }
    }
  }

  public count(): number {
    const row = this.db.prepare('SELECT count(*) as total FROM doc_cache').get() as { total: number };
    return row.total;
  }

  public close(): void {
    this.db.close();
  }
}
