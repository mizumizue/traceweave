import React from 'react';
import type { GlossaryDomain, GlossaryScope } from '../../../core/models/types.js';
import {
  GLOSSARY_DOMAIN_META,
  GLOSSARY_SCOPE_META,
  getGlossaryDomainMeta,
  getGlossaryScopeMeta,
} from '../../../core/models/glossaryTaxonomy.js';

interface GlossaryTaxonomyBadgeProps {
  scope?: GlossaryScope | string;
  domain?: GlossaryDomain | string;
  compact?: boolean;
}

export function GlossaryTaxonomyBadge({ scope, domain, compact = false }: GlossaryTaxonomyBadgeProps) {
  const scopeMeta = getGlossaryScopeMeta(scope);
  const domainMeta = getGlossaryDomainMeta(domain);

  if (!scopeMeta && !domainMeta) {
    return null;
  }

  const scopeClass =
    scopeMeta?.id === 'platform'
      ? 'bg-orange-950/90 text-orange-200 border-orange-700/60'
      : 'bg-slate-900/90 text-slate-200 border-slate-600/60';

  const domainClass = 'bg-indigo-950/80 text-indigo-200 border-indigo-700/50';

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {scopeMeta && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${scopeClass}`}
          title={scopeMeta.description}
        >
          {compact ? scopeMeta.short : scopeMeta.label}
        </span>
      )}
      {domainMeta && domainMeta.id !== 'platform' && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${domainClass}`}
          title={GLOSSARY_DOMAIN_META[domainMeta.id].label}
        >
          {compact ? domainMeta.short : domainMeta.label}
        </span>
      )}
      {domainMeta?.id === 'platform' && scopeMeta?.id === 'platform' && !compact && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${domainClass}`}
        >
          {GLOSSARY_DOMAIN_META.platform.label}
        </span>
      )}
    </span>
  );
}
