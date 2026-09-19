import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
  EXPORT_OUTPUT_DIR,
  EXPORT_STRUCTURE,
  SYSTEM_OVERVIEW_INDEX_ROWS,
} from './lib/document-export-structure.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUTPUT_DIR = path.join(ROOT, EXPORT_OUTPUT_DIR);

const require = createRequire(import.meta.url);
const srcPackage = path.join(ROOT, 'src', 'package.json');
const matter = fs.existsSync(srcPackage)
  ? createRequire(srcPackage)('gray-matter')
  : require('gray-matter');

type DocMeta = {
  id: string;
  kind?: string;
  title?: string;
  status?: string;
  scope?: string;
  depends_on?: string[];
  verifies?: string[];
  requirement_refs?: string[];
  requirement_class?: string;
  tags?: string[];
};

function readDocMeta(relativePath: string): DocMeta | null {
  const abs = path.join(DOCS_DIR, relativePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Missing document: ${relativePath}`);
  }
  const { data } = matter(fs.readFileSync(abs, 'utf8'));
  if (data.status === 'deprecated' || data.status === 'superseded') {
    return null;
  }
  return {
    id: data.id ?? path.basename(relativePath, '.md'),
    kind: data.kind,
    title: data.title,
    status: data.status,
    scope: data.scope,
    depends_on: data.depends_on ?? [],
    verifies: data.verifies ?? [],
    requirement_refs: data.requirement_refs ?? [],
    requirement_class: data.requirement_class,
    tags: data.tags ?? [],
  };
}

function canonicalLink(relativePath: string): string {
  return `../../docs/${relativePath}`;
}

function shortTitle(title: string, max = 48): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

function specBoundary(tags: string[]): string {
  if (tags.includes('cli')) return 'CLI';
  if (tags.some(t => t.includes('api') || t === 'test-runner')) return 'API';
  if (tags.some(t => t.startsWith('web'))) return 'Web';
  return 'Web';
}

function formatRequirementRefs(refs: string[]): string {
  if (refs.length === 0) return '-';
  if (refs.length <= 3) return refs.join(', ');
  const first = refs[0];
  const last = refs[refs.length - 1];
  if (first.startsWith('REQ-') && last.startsWith('REQ-')) {
    const f = Number(first.split('-')[1]);
    const l = Number(last.split('-')[1]);
    if (l - f + 1 === refs.length) {
      return `${first}〜${last.split('-')[1].replace(/^0+/, '') || last.split('-')[1]}`;
    }
  }
  return refs.join(', ');
}

function demoteHeadings(markdown: string, levels: number): string {
  if (levels <= 0) return markdown;
  return markdown.replace(/^(#{1,6})(\s)/gm, (_, hashes: string, space: string) => {
    const next = Math.min(hashes.length + levels, 6);
    return '#'.repeat(next) + space;
  });
}

function formatDocBody(relativePath: string): string {
  const abs = path.join(DOCS_DIR, relativePath);
  const raw = fs.readFileSync(abs, 'utf8');
  const { data, content } = matter(raw);

  if (data.status === 'deprecated' || data.status === 'superseded') {
    return '';
  }

  const docId = data.id ?? path.basename(relativePath, '.md');
  const hasSchema = Boolean(data.kind);

  let body = content.trim();
  body = body.replace(/^## Content\s*\n?/m, '');
  body = demoteHeadings(body, 1);

  if (!hasSchema) {
    const headingMatch = body.match(/^##\s+(.+)/);
    const title = headingMatch?.[1] ?? docId;
    return [`#### ${docId}: ${title}`, '', `| 正本 | \`${relativePath}\` |`, '', body].join('\n');
  }

  const metaLines = [
    `| 項目 | 値 |`,
    `|---|---|`,
    `| ID | ${docId} |`,
    `| 種別 | ${data.kind} |`,
    `| タイトル | ${data.title} |`,
    `| ステータス | ${data.status} |`,
  ];
  if (data.depends_on?.length) metaLines.push(`| 依存 | ${data.depends_on.join(', ')} |`);
  if (data.verifies?.length) metaLines.push(`| 検証対象 | ${data.verifies.join(', ')} |`);
  if (data.requirement_class) metaLines.push(`| 要件区分 | ${data.requirement_class} |`);
  metaLines.push(`| 正本 | \`${relativePath}\` |`);

  const title = `${docId}: ${data.title}`;
  return [`#### ${title}`, '', ...metaLines, '', body].join('\n');
}

function listTcFiles(): string[] {
  return fs
    .readdirSync(path.join(DOCS_DIR, 'test-cases'))
    .filter(f => f.endsWith('.md') && /^TC-\d+\.md$/.test(f))
    .sort((a, b) => a.localeCompare(b))
    .map(f => `test-cases/${f}`);
}

function buildIndexTableRow(sectionHeading: string, relativePath: string, meta: DocMeta): string {
  const link = `[${relativePath.split('/').pop()}](${canonicalLink(relativePath)})`;

  if (sectionHeading.startsWith('1.2')) {
    return `| ${meta.id} | ${shortTitle(meta.title ?? '')} | ${link} |`;
  }
  if (sectionHeading.startsWith('1.3') || sectionHeading.startsWith('1.7')) {
    return `| ${meta.id} | ${shortTitle(meta.title ?? '')} | ${link} |`;
  }
  if (sectionHeading.startsWith('1.4')) {
    return `| ${meta.id} | ${shortTitle(meta.title ?? '')} | ${formatRequirementRefs(meta.requirement_refs ?? [])} | ${link} |`;
  }
  if (sectionHeading.startsWith('1.5') || sectionHeading.startsWith('1.6')) {
    const need = meta.depends_on?.[0] ?? '-';
    return `| ${meta.id} | ${shortTitle(meta.title ?? '')} | ${need} | ${link} |`;
  }
  if (sectionHeading.startsWith('2.1')) {
    return `| ${meta.id} | ${shortTitle(meta.title ?? '')} | ${meta.scope ?? 'local'} | ${link} |`;
  }
  if (sectionHeading.startsWith('2.2')) {
    return `| ${meta.id} | ${specBoundary(meta.tags ?? [])} | ${shortTitle(meta.title ?? '')} | ${link} |`;
  }
  if (sectionHeading.startsWith('2.3') || sectionHeading.startsWith('2.4')) {
    return `| ${meta.id} | ${shortTitle(meta.title ?? '')} | ${link} |`;
  }
  if (sectionHeading.startsWith('3.')) {
    const upstream = (meta.depends_on ?? []).filter(id => id.startsWith('SPEC-')).join(', ') || '-';
    return `| ${meta.id} | ${shortTitle(meta.title ?? '')} | ${upstream} | ${link} |`;
  }
  return `| ${meta.id} | ${shortTitle(meta.title ?? '')} | ${link} |`;
}

function indexTableHeader(sectionHeading: string): string {
  if (sectionHeading.startsWith('1.2')) return '| ID | 役割 | 正本 |\n|---|---|---|';
  if (sectionHeading.startsWith('1.3')) return '| ID | ニーズ | 正本 |\n|---|---|---|';
  if (sectionHeading.startsWith('1.4')) return '| ID | シナリオ | 関連要件 | 正本 |\n|---|---|---|---|';
  if (sectionHeading.startsWith('1.5') || sectionHeading.startsWith('1.6')) {
    return '| ID | 要件 | 上流 NEED | 正本 |\n|---|---|---|---|';
  }
  if (sectionHeading.startsWith('1.7')) return '| ID | 対象 | 正本 |\n|---|---|---|';
  if (sectionHeading.startsWith('2.1')) return '| ID | 設計 | 範囲 | 正本 |\n|---|---|---|---|';
  if (sectionHeading.startsWith('2.2')) return '| ID | 境界 | 対象 | 正本 |\n|---|---|---|---|';
  if (sectionHeading.startsWith('2.3') || sectionHeading.startsWith('2.4')) {
    return '| ID | 契約 / 決定 | 正本 |\n|---|---|---|';
  }
  if (sectionHeading.startsWith('3.')) return '| ID | モジュール | 上流 SPEC | 正本 |\n|---|---|---|---|';
  return '| ID | タイトル | 正本 |\n|---|---|---|';
}

function buildDocumentIndex(): string {
  const generatedAt = new Date().toISOString().slice(0, 10);
  const tcCount = listTcFiles().length;
  const lines: string[] = [
    '# TraceWeave 設計文書インデックス（3書類集約目次）',
    '',
    '本書は、`docs/` 配下に分散管理されている V字モデル成果物を、伝統的な **要件定義書・基本設計書・詳細設計書** の3層に再編した**集約目次**である。各項目は正本ファイルへの参照リンクであり、本文の複製は行わない。',
    '',
    '> **運用方針**: 正本は常に個別成果物（`NEED-` / `REQ-` / `SPEC-` / `DSN-` 等）であり、本インデックスは閲覧・レビュー・外部提出時のナビゲーション用途とする。',
    '> **生成物**: `.export/docs/` に出力。Git 追跡外。',
    '',
    '---',
    '',
  ];

  for (const { part, sections } of EXPORT_STRUCTURE) {
    lines.push(`## ${part}`, '');
    for (const section of sections) {
      lines.push(`### ${section.heading}`, '');
      if (section.heading.startsWith('1.1')) {
        lines.push('| 章 | 内容 | 正本 |', '|---|---|---|');
        for (const [id, label, file, anchor] of SYSTEM_OVERVIEW_INDEX_ROWS) {
          lines.push(
            `| ${id} | ${label} | [${file}](${canonicalLink(file)}) ${anchor} |`
          );
        }
        lines.push('');
        continue;
      }
      lines.push(indexTableHeader(section.heading));
      for (const file of section.files) {
        const meta = readDocMeta(file);
        if (!meta) continue;
        lines.push(buildIndexTableRow(section.heading, file, meta));
      }
      lines.push('');
    }
    lines.push('---', '');
  }

  lines.push(
    '## 付録 A: トレーサビリティマトリクス（概要）',
    '',
    '```text',
    'NEED ──► REQ ──► SPEC ──► DSN',
    '  │        │        │        │',
    '  │        └────────┴────────┴──► TC (verifies: REQ/SPEC)',
    '  └──► UC (requirement_refs: REQ)',
    'ACT ──► UC (actor_refs)',
    'ADR ──► (links: DSN)',
    'QA  ──► (depends_on: REQ/SPEC, links: TC)',
    '```',
    '',
    '- **依存方向**: `NEED ← REQ ← SPEC ← DSN`（`depends_on`）',
    '- **検証方向**: `TC → REQ/SPEC`（`verifies`）',
    '- **DSN カバレッジ**: 全 active SPEC に対応 DSN が必須（100%）',
    '- **機械検証**: `npm --prefix src run lint`',
    '',
    '## 付録 B: テストケース一覧',
    '',
    `全${tcCount}件のテストケースは [test-cases/](../../docs/test-cases/) を参照。統合本文は [CONSOLIDATED_DESIGN.md](./CONSOLIDATED_DESIGN.md)。`,
    '',
    '| 領域 | 代表 TC |',
    '|---|---|',
    '| グラフ・パーサー | TC-UT-0001, TC-ITb-0002 |',
    '| CLI・CI | TC-ITb-0003, TC-UAT-0001, TC-ITb-0024 |',
    '| 対話型テスト | TC-ITb-0005, TC-ITb-0006 |',
    '| UI 操作 | TC-ITb-0011, TC-UT-0004, TC-ST-0001, TC-ITb-0020 |',
    '| グラフ表示 | TC-ITb-0023 |',
    '| URL/履歴 | TC-ITb-0015, TC-ITb-0016 |',
    '| 要件区分 | TC-UT-0007, TC-ITa-0002-01, TC-UT-0008 |',
    '| トースト | TC-ITb-0025 |',
    '',
    '---',
    '',
    `*最終更新: ${generatedAt}（自動生成）*`,
    ''
  );

  return lines.join('\n');
}

function buildConsolidated(): string {
  const generatedAt = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    '# TraceWeave 統合設計文書',
    '',
    '> 要件定義書・基本設計書・詳細設計書を単一 Markdown に集約した生成物です。',
    `> 生成日: ${generatedAt} / 正本は \`docs/\` 配下の個別ファイルです。`,
    '> **生成物**: `.export/docs/` に出力。Git 追跡外。目次は [DOCUMENT_INDEX.md](./DOCUMENT_INDEX.md)。',
    '',
    '---',
    '',
  ];

  let docCount = 0;

  for (const { part, sections } of EXPORT_STRUCTURE) {
    lines.push(`# ${part}`, '');
    for (const section of sections) {
      lines.push(`## ${section.heading}`, '');
      for (const file of section.files) {
        const block = formatDocBody(file);
        if (!block) continue;
        lines.push(block, '', '---', '');
        docCount += 1;
      }
    }
  }

  lines.push('# 付録 A: テストケース', '');
  for (const file of listTcFiles()) {
    const block = formatDocBody(file);
    if (!block) continue;
    lines.push(block, '', '---', '');
    docCount += 1;
  }

  lines.push(
    '# 付録 B: トレーサビリティ概要',
    '',
    '```text',
    'NEED ──► REQ ──► SPEC ──► DSN',
    '  │        │        │        │',
    '  │        └────────┴────────┴──► TC (verifies: REQ/SPEC)',
    '  └──► UC (requirement_refs: REQ)',
    'ACT ──► UC (actor_refs)',
    'ADR ──► (links: DSN)',
    'QA  ──► (depends_on: REQ/SPEC, links: TC)',
    '```',
    '',
    `- 集約ドキュメント数: ${docCount}`,
    `- 機械検証: \`npm --prefix src run lint\``,
    ''
  );

  return lines.join('\n');
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const indexPath = path.join(OUTPUT_DIR, 'DOCUMENT_INDEX.md');
const consolidatedPath = path.join(OUTPUT_DIR, 'CONSOLIDATED_DESIGN.md');

const indexContent = buildDocumentIndex();
const consolidatedContent = buildConsolidated();

fs.writeFileSync(indexPath, indexContent, 'utf8');
fs.writeFileSync(consolidatedPath, consolidatedContent, 'utf8');

const indexKb = (Buffer.byteLength(indexContent, 'utf8') / 1024).toFixed(1);
const consolidatedKb = (Buffer.byteLength(consolidatedContent, 'utf8') / 1024).toFixed(1);

console.log(`Wrote ${indexPath} (${indexKb} KB)`);
console.log(`Wrote ${consolidatedPath} (${consolidatedKb} KB, ${consolidatedContent.split('\n').length} lines)`);

// 旧配置の生成物を除去
for (const stale of ['CONSOLIDATED_DESIGN.md', 'DOCUMENT_INDEX.md']) {
  const stalePath = path.join(DOCS_DIR, stale);
  if (fs.existsSync(stalePath)) {
    fs.unlinkSync(stalePath);
    console.log(`Removed stale ${stalePath}`);
  }
}
