import type { DocKind, GlossaryDomain, GlossaryScope, GlossaryTaxonomyCounts } from './types.js';

export const GLOSSARY_SCOPES: readonly GlossaryScope[] = ['platform', 'general'] as const;

export const GLOSSARY_DOMAINS: readonly GlossaryDomain[] = [
  'platform',
  'project_management',
  'requirements_engineering',
  'testing',
  'programming',
  'architecture',
  'operations',
  'security',
  'data',
  'quality',
] as const;

export const GENERAL_GLOSSARY_DOMAINS: readonly GlossaryDomain[] = GLOSSARY_DOMAINS.filter(
  d => d !== 'platform'
);

export const GLOSSARY_SCOPE_META: Record<
  GlossaryScope,
  { id: GlossaryScope; short: string; label: string; description: string }
> = {
  platform: {
    id: 'platform',
    short: 'TW',
    label: 'TraceWeave 固有',
    description: 'トレーサビリティ・工程地層・決め事カタログなど本プロダクトの概念',
  },
  general: {
    id: 'general',
    short: '一般',
    label: '一般的なシステム開発',
    description: '業界横断で使われるソフトウェア工学・運用の用語',
  },
};

export const GLOSSARY_DOMAIN_META: Record<
  GlossaryDomain,
  { id: GlossaryDomain; short: string; label: string; scope: GlossaryScope | 'both' }
> = {
  platform: {
    id: 'platform',
    short: 'TW',
    label: 'TraceWeave',
    scope: 'platform',
  },
  project_management: {
    id: 'project_management',
    short: 'PM',
    label: 'プロジェクト管理',
    scope: 'general',
  },
  requirements_engineering: {
    id: 'requirements_engineering',
    short: 'REQ',
    label: '要求・要件',
    scope: 'general',
  },
  testing: {
    id: 'testing',
    short: 'TEST',
    label: 'テスト',
    scope: 'general',
  },
  programming: {
    id: 'programming',
    short: 'DEV',
    label: 'プログラミング',
    scope: 'general',
  },
  architecture: {
    id: 'architecture',
    short: 'ARCH',
    label: 'アーキテクチャ',
    scope: 'general',
  },
  operations: {
    id: 'operations',
    short: 'OPS',
    label: '運用・インフラ',
    scope: 'general',
  },
  security: {
    id: 'security',
    short: 'SEC',
    label: 'セキュリティ',
    scope: 'general',
  },
  data: {
    id: 'data',
    short: 'DATA',
    label: 'データ・DB',
    scope: 'general',
  },
  quality: {
    id: 'quality',
    short: 'QA',
    label: '品質・非機能',
    scope: 'general',
  },
};

const DOMAIN_OVERRIDES: Record<string, GlossaryDomain> = {
  'GLO-0017': 'architecture',
  'GLO-0018': 'architecture',
  'GLO-0019': 'requirements_engineering',
  'GLO-0024': 'operations',
  'GLO-0063': 'programming',
  'GLO-0076': 'architecture',
  'GLO-0092': 'programming',
  'GLO-0096': 'programming',
  'GLO-0103': 'programming',
  'GLO-0110': 'programming',
};

const PLATFORM_GLOSSARY_MAX_NUM = 14;

export function isGlossaryScope(value: unknown): value is GlossaryScope {
  return value === 'platform' || value === 'general';
}

export function isGlossaryDomain(value: unknown): value is GlossaryDomain {
  return typeof value === 'string' && (GLOSSARY_DOMAINS as readonly string[]).includes(value);
}

export function resolveGlossaryScopeFromId(id: string): GlossaryScope {
  const match = /^GLO-(\d+)$/.exec(id);
  if (!match) return 'general';
  const num = parseInt(match[1], 10);
  return num <= PLATFORM_GLOSSARY_MAX_NUM ? 'platform' : 'general';
}

export function inferGlossaryDomain(id: string, tags: string[]): GlossaryDomain {
  if (DOMAIN_OVERRIDES[id]) {
    return DOMAIN_OVERRIDES[id];
  }

  const tagSet = new Set(tags);
  if (tagSet.has('testing')) return 'testing';
  if (tagSet.has('security')) return 'security';
  if (tagSet.has('data')) return 'data';
  if (tagSet.has('architecture') || tagSet.has('integration') || tagSet.has('domain')) {
    return 'architecture';
  }
  if (tagSet.has('requirements') || tagSet.has('specification')) {
    return 'requirements_engineering';
  }
  if (tagSet.has('practice') || tagSet.has('design')) return 'programming';
  if (tagSet.has('lifecycle') || tagSet.has('governance')) return 'project_management';
  if (tagSet.has('operations')) return 'operations';
  if (tagSet.has('quality')) return 'quality';
  return 'requirements_engineering';
}

export function resolveGlossaryTaxonomy(
  id: string,
  tags: string[]
): { glossary_scope: GlossaryScope; glossary_domain: GlossaryDomain } {
  const glossary_scope = resolveGlossaryScopeFromId(id);
  const glossary_domain =
    glossary_scope === 'platform' ? 'platform' : inferGlossaryDomain(id, tags);
  return { glossary_scope, glossary_domain };
}

export function isValidGlossaryTaxonomyPair(
  scope: GlossaryScope,
  domain: GlossaryDomain
): boolean {
  if (scope === 'platform') return domain === 'platform';
  return domain !== 'platform';
}

export function countGlossaryTaxonomy(
  items: Array<{
    kind?: DocKind;
    glossary_scope?: unknown;
    glossary_domain?: unknown;
    glossaryScope?: unknown;
    glossaryDomain?: unknown;
  }>
): GlossaryTaxonomyCounts {
  const byScope: Record<GlossaryScope, number> = { platform: 0, general: 0 };
  const byDomain = Object.fromEntries(
    GLOSSARY_DOMAINS.map(d => [d, 0])
  ) as Record<GlossaryDomain, number>;
  let unclassified = 0;

  for (const item of items) {
    if (item.kind !== 'glossary') continue;
    const scope = item.glossary_scope ?? item.glossaryScope;
    const domain = item.glossary_domain ?? item.glossaryDomain;
    if (!isGlossaryScope(scope) || !isGlossaryDomain(domain)) {
      unclassified += 1;
      continue;
    }
    if (!isValidGlossaryTaxonomyPair(scope, domain)) {
      unclassified += 1;
      continue;
    }
    byScope[scope] += 1;
    byDomain[domain] += 1;
  }

  return { byScope, byDomain, unclassified };
}

export function matchesGlossaryScopeFilter(
  item: {
    kind?: DocKind;
    glossary_scope?: unknown;
    glossaryScope?: unknown;
  },
  filter?: GlossaryScope | 'all' | string | null
): boolean {
  if (!filter || filter === 'all') return true;
  if (item.kind && item.kind !== 'glossary') return true;
  const scope = item.glossary_scope ?? item.glossaryScope;
  return scope === filter;
}

export function matchesGlossaryDomainFilter(
  item: {
    kind?: DocKind;
    glossary_domain?: unknown;
    glossaryDomain?: unknown;
  },
  filter?: GlossaryDomain | 'all' | string | null
): boolean {
  if (!filter || filter === 'all') return true;
  if (item.kind && item.kind !== 'glossary') return true;
  const domain = item.glossary_domain ?? item.glossaryDomain;
  return domain === filter;
}

export function getGlossaryScopeMeta(value: unknown) {
  return isGlossaryScope(value) ? GLOSSARY_SCOPE_META[value] : undefined;
}

export function getGlossaryDomainMeta(value: unknown) {
  return isGlossaryDomain(value) ? GLOSSARY_DOMAIN_META[value] : undefined;
}
