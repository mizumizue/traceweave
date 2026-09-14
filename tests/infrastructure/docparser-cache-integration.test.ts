import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { SQLiteCache } from '../../src/infrastructure/storage/SQLiteCache.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: DocParser & SQLiteCache（仕様セクション抽出・ADR-0006 純化・キャッシュ永続化の外部結合）
 * - 条件: 4仕様セクションのみの test_case Markdown 文書を SQLite キャッシュ有効状態でパース
 * - 期待結果: 仕様セクションが正確に抽出され、execution_status は pending、actual_result は未設定、キャッシュ再取得時も同一データが得られること
 * - 関連文書: TC-0027, REQ-0006, REQ-0007, SPEC-0006, SPEC-0007, ADR-0006
 */
test('TC-0027: DocParser & SQLiteCache - 仕様セクション抽出・pending 既定値およびキャッシュ永続化の外部結合検証', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-parser-cache-'));
  const dbPath = path.join(tmpDir, 'cache.sqlite');
  const cache = new SQLiteCache(dbPath);
  const parser = new DocParser(cache);

  try {
    const subDir = path.join(tmpDir, 'test-cases');
    fs.mkdirSync(subDir, { recursive: true });
    const docPath = path.join(subDir, 'TC-9999.md');
    const fixturePath = repositoryPath('tests/fixtures/docs/docparser-cache/test-cases/TC-9999.md');
    fs.copyFileSync(fixturePath, docPath);

    const cacheMtime = new Date('2020-01-01T00:00:00.000Z');
    fs.utimesSync(docPath, cacheMtime, cacheMtime);

    // 1. Initial parse via parseDirectory (Cache miss & insert)
    const nodes1 = parser.parseDirectory(tmpDir);
    assert.equal(nodes1.length, 1);
    const node1 = nodes1[0];
    assert.equal(node1.id, 'TC-9999');
    assert.equal(node1.execution_status, 'pending');
    assert.equal(node1.actual_result, undefined);
    assert.equal(node1.evidence_log, undefined);
    assert.ok(node1.sections);
    assert.ok(node1.sections['Objective']?.includes('パーサーとSQLiteキャッシュ'));
    assert.ok(node1.sections['Steps']?.includes('パースを実行する'));
    assert.equal(node1.sections['Actual Results'], undefined);
    assert.equal(node1.sections['Evidence'], undefined);

    const originalContents = fs.readFileSync(docPath, 'utf-8');
    fs.writeFileSync(docPath, `${originalContents}\nchanged after first parse`, 'utf-8');
    fs.utimesSync(docPath, cacheMtime, cacheMtime);

    // 2. Second parse via parseDirectory (Cache hit)
    const nodes2 = parser.parseDirectory(tmpDir);
    assert.equal(nodes2.length, 1);
    const node2 = nodes2[0];
    assert.equal(node2.id, node1.id);
    assert.equal(node2.execution_status, 'pending');
    assert.equal(node2.actual_result, undefined);
    assert.equal(node2.content, node1.content);
    assert.deepEqual(node2.sections, node1.sections);

    // 3. Verify SQLite DB has stored the node
    const normalizedPath = DocParser.toPortablePath(docPath);
    const cachedNode = cache.get(normalizedPath, Math.floor(fs.statSync(docPath).mtimeMs));
    assert.ok(cachedNode, 'Node must exist in SQLite cache table');
    assert.equal(cachedNode.id, 'TC-9999');
    assert.equal(cachedNode.content, node1.content);
  } finally {
    cache.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
