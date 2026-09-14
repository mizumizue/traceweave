import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SQLiteCache } from '../../src/infrastructure/storage/SQLiteCache.js';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';
import { repositoryPath } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: SQLiteCache (ファイル更新日時によるSQLiteインメモリキャッシュ)
 * - 条件: パース済みDocNodeを同一mtime(1000)で保存し、同一mtimeおよび異なるmtime(2000)で取得
 * - 期待結果: 同一mtimeではキャッシュヒットしてノードが正しく復元され、異なるmtimeではキャッシュミス(null)となること
 * - 関連文書: TC-0004, REQ-0004, SPEC-0004
 */
test('TC-0004: SQLiteCache - ファイル更新日時（mtime）に基づくパース済みノードの保存・取得およびキャッシュミス検知ができること', () => {
  const cache = new SQLiteCache(':memory:');

  const filePath = 'C:/dummy/REQ-0001.md';
  const node = {
    id: 'REQ-0001',
    kind: 'requirement' as const,
    title: 'Req 1',
    status: 'accepted' as const,
    created: '2026-09-12',
    updated: '2026-09-12',
    scope: 'local' as const,
    criticality: 'high' as const,
    requirement_class: 'functional' as const,
    depends_on: ['NEED-0001'],
    tags: [],
    links: [],
    content: 'test content',
  };

  // Initially empty
  assert.equal(cache.get(filePath, 1000), null);

  // Set
  cache.set(filePath, 1000, node);
  assert.equal(cache.count(), 1);

  // Get with exact mtime
  const retrieved = cache.get(filePath, 1000);
  assert.ok(retrieved);
  assert.equal(retrieved.id, 'REQ-0001');
  assert.equal(retrieved.criticality, 'high');

  // Get with different mtime returns null (cache miss)
  assert.equal(cache.get(filePath, 2000), null);

  cache.close();
});

/**
 * 【テスト概要】
 * - 対象: DocParser & SQLiteCache 連携
 * - 条件: フィクスチャから取得したMarkdownドキュメントを一時ディレクトリに展開し、同一パーサーで2回パースを実行
 * - 期待結果: 1回目のパースでファイルが読み込まれてキャッシュ登録され、2回目のパースではキャッシュから取得されること
 * - 関連文書: TC-0004, REQ-0004, SPEC-0004
 */
test('TC-0004: DocParser - ディレクトリ全体のパースにおいてSQLiteキャッシュが機能し高速化されること', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-test-'));
  const needsDir = path.join(tmpDir, 'needs');
  fs.mkdirSync(needsDir);

  const sampleFile = path.join(needsDir, 'NEED-0001.md');
  const fixtureFile = repositoryPath('tests/fixtures/docs/storage/needs/NEED-0001.md');
  fs.copyFileSync(fixtureFile, sampleFile);

  const cacheMtime = new Date('2020-01-01T00:00:00.000Z');
  fs.utimesSync(sampleFile, cacheMtime, cacheMtime);

  const cache = new SQLiteCache(':memory:');
  const parser = new DocParser(cache);

  // First parse (cache miss)
  const nodes1 = parser.parseDirectory(tmpDir);
  assert.equal(nodes1.length, 1);
  assert.equal(nodes1[0].id, 'NEED-0001');
  assert.equal(nodes1[0].sections?.['Background'], 'Background text');
  assert.equal(cache.count(), 1);

  const originalContents = fs.readFileSync(sampleFile, 'utf8');
  fs.writeFileSync(sampleFile, `${originalContents}\nchanged after first parse`);
  fs.utimesSync(sampleFile, cacheMtime, cacheMtime);

  // Second parse (cache hit)
  const nodes2 = parser.parseDirectory(tmpDir);
  assert.equal(nodes2.length, 1);
  assert.equal(nodes2[0].id, 'NEED-0001');
  assert.equal(nodes2[0].content, nodes1[0].content);
  assert.equal(nodes2[0].sections?.['Background'], 'Background text');

  cache.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * 【テスト概要】
 * - 対象: DocParser (test_case 文書の仕様セクションおよび ADR-0006 純化)
 * - 条件: Objective、Preconditions、Steps、Expected Results の4セクションのみを含む test_case マークダウンフィクスチャをパース
 * - 期待結果: execution_status は pending、actual_result/evidence_log は未設定、4仕様セクションのみが DocNode にマッピングされること
 * - 関連文書: TC-0008, REQ-0007, SPEC-0007, ADR-0006
 */
test('TC-0008: DocParser - test_case文書の仕様セクション（Objective/Steps/Expected Results）を正しくパースし、実行結果は pending 既定値とすること', () => {
  const tcFile = repositoryPath('tests/fixtures/docs/storage/test-cases/TC-0001.md');
  const parser = new DocParser();
  const node = parser.parseFile(tcFile);
  assert.ok(node);
  assert.equal(node.id, 'TC-0001');
  assert.equal(node.execution_status, 'pending');
  assert.equal(node.actual_result, undefined);
  assert.equal(node.evidence_log, undefined);
  assert.equal(node.objective, 'Verify that units pass accurately.');
  assert.equal(node.expected_result, 'Return value is true.');
  assert.ok(node.steps?.includes('1. Run test function.'));
  assert.equal(node.sections?.['Objective'], 'Verify that units pass accurately.');
  assert.equal(node.sections?.['Preconditions'], 'System is ready.');
  assert.equal(node.sections?.['Expected Results'], 'Return value is true.');
  assert.equal(node.sections?.['Actual Results'], undefined);
  assert.equal(node.sections?.['Evidence'], undefined);
});
