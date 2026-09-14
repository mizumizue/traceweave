import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';

/**
 * 【テスト概要】
 * - 対象: DocParser (Markdown セクション抽出)
 * - 条件: `### Title` 直後に空行がある V字モデル文書（別リポで発見されたパターン）
 * - 期待結果: Statement / Acceptance Criteria の本文が空にならず正しく sections に格納されること
 */
test('DocParser - 見出し直後の空行を含む文書でもセクション本文が正しく抽出されること', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traceweave-parser-sections-'));
  const docsDir = path.join(tmpDir, 'requirements');
  fs.mkdirSync(docsDir, { recursive: true });
  const docPath = path.join(docsDir, 'REQ-0001.md');
  fs.writeFileSync(
    docPath,
    `---
id: REQ-0001
kind: requirement
title: Sample requirement
status: draft
created: "2026-09-14"
updated: "2026-09-14"
scope: local
requirement_class: functional
depends_on: []
tags: []
links: []
---
## Content

### Statement

利用者は、保存済みの記憶をキーワードで検索できる。

### Acceptance Criteria

- AC-001: Given 保存済みの記憶がある When 利用者がキーワードを指定して検索する Then キーワードに一致する記憶が表示される
`,
    'utf-8'
  );

  try {
    const parser = new DocParser();
    const node = parser.parseFile(docPath);
    assert.ok(node);
    assert.equal(node?.sections?.['Statement'], '利用者は、保存済みの記憶をキーワードで検索できる。');
    assert.match(node?.sections?.['Acceptance Criteria'] || '', /AC-001/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
