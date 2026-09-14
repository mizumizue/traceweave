import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildTraceWeaveReport } from '../../src/application/build-report.js';
import { TestReportLoader } from '../../src/infrastructure/testing/TestReportLoader.js';
import {
  isPathInsideRoot,
  resolveProjectLayout,
  resolveRepoRoot,
} from '../../src/infrastructure/system/resolveRepoRoot.js';
import { repositoryPath, repositoryRoot } from '../helpers/repo-path.js';

/**
 * 【テスト概要】
 * - 対象: resolveRepoRoot / isPathInsideRoot
 * - 条件: ソース配置・コンパイル配置の module URL からルート解決し、パストラバーサル判定を行う
 * - 期待結果: 実リポジトリルートが返り、distWeb 外のパスは拒否されること
 */
test('resolveRepoRoot - ソースおよび dist 配置から同一のリポジトリルートを解決できること', () => {
  const fromBuildReport = resolveRepoRoot(pathToFileURL(repositoryPath('src/application/build-report.ts')).href);
  const fromCompiled = resolveRepoRoot(pathToFileURL(repositoryPath('src/dist/application/build-report.js')).href);
  const fromTestLoader = resolveRepoRoot(
    pathToFileURL(repositoryPath('src/infrastructure/testing/TestReportLoader.ts')).href
  );

  assert.equal(fromBuildReport, repositoryRoot);
  assert.equal(fromCompiled, repositoryRoot);
  assert.equal(fromTestLoader, repositoryRoot);
});

test('resolveRepoRoot - buildTraceWeaveReport がコンパイル経路でも docs/ を正しく参照できること', () => {
  const compiledUrl = pathToFileURL(repositoryPath('src/dist/application/build-report.js')).href;
  const { nodes } = buildTraceWeaveReport({
    docsDir: path.join(resolveRepoRoot(compiledUrl), 'docs'),
    useCache: false,
    loadTestReport: false,
  });
  assert.ok(nodes.length > 0, 'compiled path resolution should load repository docs');
});

test('resolveRepoRoot - TestReportLoader が reports/test-results.json をリポジトリルート基準で参照できること', () => {
  const report = TestReportLoader.loadReport();
  assert.ok(report, 'test report should be discoverable from repository root');
});

/**
 * 【テスト概要】
 * - 対象: resolveProjectLayout / buildTraceWeaveReport の subject 解決
 * - 条件: 外部リポジトリの docs/ を指定し、CLI は TraceWeave 本体側から実行する想定
 * - 期待結果: subject が docs の親リポジトリから解決され、CLI インストール先名にならないこと
 * - 関連文書: REQ-0030, SPEC-0025
 */
test('resolveProjectLayout - 外部 docs 指定時に subject をホストリポジトリから解決できること', () => {
  const hostRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-host-repo-'));
  try {
    fs.mkdirSync(path.join(hostRoot, 'docs'), { recursive: true });
    fs.writeFileSync(
      path.join(hostRoot, 'package.json'),
      JSON.stringify({ name: 'lucid-memories' }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(hostRoot, 'docs', 'NEED-0001.md'),
      `---
schema_version: 3
id: NEED-0001
kind: need
title: Host need
status: accepted
created: "2026-09-14"
updated: "2026-09-14"
scope: local
depends_on: []
tags: []
links: []
---
## Content

### Background
b

### Problem
p

### Desired Outcome
o
`,
      'utf-8'
    );

    const layout = resolveProjectLayout({
      docsDir: path.join(hostRoot, 'docs'),
      moduleUrl: pathToFileURL(repositoryPath('src/dist/application/build-report.js')).href,
    });
    assert.equal(layout.projectRoot, hostRoot);

    const { report } = buildTraceWeaveReport({
      docsDir: path.join(hostRoot, 'docs'),
      useCache: false,
      loadTestReport: false,
    });
    assert.equal(report.subject.displayName, 'lucid-memories');
    assert.equal(report.subject.source, 'package_json');
  } finally {
    fs.rmSync(hostRoot, { recursive: true, force: true });
  }
});

test('isPathInsideRoot - distWeb 外へのパストラバーサル要求を拒否できること', () => {
  const distWeb = repositoryPath('src/web/dist');
  const escaped = path.resolve(distWeb, '..', 'package.json');
  assert.equal(isPathInsideRoot(distWeb, escaped), false);
  assert.equal(isPathInsideRoot(distWeb, path.join(distWeb, 'index.html')), true);
});
