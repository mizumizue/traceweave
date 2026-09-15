import {
  DecisionsCatalog,
  DecisionsCatalogItem,
  DecisionsFilterOptions,
} from '../core/models/types.js';
import { DecisionsCatalogBuilder } from '../core/decisions/DecisionsCatalogBuilder.js';

export function filterCatalog(catalog: DecisionsCatalog, options: DecisionsFilterOptions): DecisionsCatalogItem[] {
  return DecisionsCatalogBuilder.filter(catalog, options);
}

export function formatCatalogJson(catalog: DecisionsCatalog, filtered: DecisionsCatalogItem[]): string {
  return JSON.stringify(
    {
      totalCount: catalog.totalCount,
      filteredCount: filtered.length,
      kindCounts: catalog.kindCounts,
      requirementClassCounts: catalog.requirementClassCounts,
      items: filtered,
    },
    null,
    2
  );
}

export function formatCatalogMarkdown(catalog: DecisionsCatalog, filtered: DecisionsCatalogItem[]): string {
  const lines: string[] = [
    '# TraceWeave - Decisions & Architecture Catalog\n',
    `- **Total Registered**: ${catalog.totalCount}`,
    `- **Matching**: ${filtered.length}`,
    `- **Requirement class**: FR ${catalog.requirementClassCounts.functional} / NFR ${catalog.requirementClassCounts.non_functional}\n`,
    '| Kind | ID | Class | Status | Title | Cross References | Tags |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const item of filtered) {
    const refs: string[] = [];
    if (item.relatedActors?.length) refs.push(`ACT:${item.relatedActors.map(a => a.id).join(',')}`);
    if (item.relatedUseCases?.length) refs.push(`UC:${item.relatedUseCases.map(u => u.id).join(',')}`);
    if (item.relatedDecisions?.length) refs.push(`ADR:${item.relatedDecisions.map(d => d.id).join(',')}`);
    if (item.relatedDesigns?.length) refs.push(`DSN:${item.relatedDesigns.map(d => d.id).join(',')}`);
    if (item.relatedReqs?.length) refs.push(`REQ:${item.relatedReqs.map(r => r.id).join(',')}`);
    if (item.relatedSpecs?.length) refs.push(`SPEC:${item.relatedSpecs.map(s => s.id).join(',')}`);
    if (item.relatedGlossary?.length) refs.push(`GLO:${item.relatedGlossary.map(g => g.id).join(',')}`);
    const refsStr = refs.join('; ') || '-';
    const tagsStr = item.tags.length > 0 ? item.tags.map(t => `\`${t}\``).join(' ') : '-';
    const classStr =
      item.kind === 'requirement'
        ? item.requirement_class === 'non_functional'
          ? 'NFR'
          : item.requirement_class === 'functional'
            ? 'FR'
            : '-'
        : '-';
    lines.push(
      `| \`${item.kind}\` | **${item.id}** | ${classStr} | ${item.status} | ${item.title} | ${refsStr} | ${tagsStr} |`
    );
  }
  return lines.join('\n');
}
