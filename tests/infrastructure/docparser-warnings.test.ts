import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DocParser } from '../../src/infrastructure/parser/DocParser.js';

/**
 * 【テスト概要】
 * - 対象: DocParser パース警告の収集
 * - 条件: 必須 frontmatter 欠落の Markdown を一時ディレクトリに配置して parseDirectory する
 * - 期待結果: ノードは生成されず、getLastWarnings に理由が記録されること
 */
test('DocParser - 必須 frontmatter 欠落時に警告を記録しノードをスキップすること', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-docparser-warn-'));
  const docsDir = path.join(tmpDir, 'docs');
  const reqDir = path.join(docsDir, 'requirements');
  fs.mkdirSync(reqDir, { recursive: true });
  fs.writeFileSync(
    path.join(reqDir, 'REQ-9999.md'),
    `---
schema_version: 3
kind: requirement
title: Missing ID
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
broken
`,
    'utf-8'
  );

  const parser = new DocParser();
  const nodes = parser.parseDirectory(docsDir);
  const warnings = parser.getLastWarnings();

  assert.equal(nodes.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /missing required frontmatter/i);
});
