import {
  DecisionsCatalog,
  DecisionsCatalogItem,
  DecisionsReferenceItem,
  DocKind,
  DocStatus,
} from '../../../core/models/types.js';

export type ActorUseCaseMapGrouping = 'by-actor' | 'by-use-case';

export interface ActorUseCaseMapFilter {
  searchQuery?: string;
  status?: DocStatus | 'all';
  tag?: string | null;
  kind?: DocKind | 'all';
}

export interface ActorUseCaseRow {
  actor: DecisionsCatalogItem;
  useCases: DecisionsReferenceItem[];
}

export interface UseCaseActorRow {
  useCase: DecisionsCatalogItem;
  actors: DecisionsReferenceItem[];
}

export interface ActorUseCaseMapData {
  byActor: ActorUseCaseRow[];
  byUseCase: UseCaseActorRow[];
  orphanActors: DecisionsCatalogItem[];
  orphanUseCases: DecisionsCatalogItem[];
  linkCount: number;
  kindFilterBlocksView: boolean;
}

function matchesSearch(item: DecisionsCatalogItem, query: string): boolean {
  const inId = item.id.toLowerCase().includes(query);
  const inTitle = item.title.toLowerCase().includes(query);
  const inTags = item.tags.some(t => t.toLowerCase().includes(query));
  const inContent = item.content.toLowerCase().includes(query);
  const inSections = item.sections
    ? Object.entries(item.sections).some(
        ([heading, text]) =>
          heading.toLowerCase().includes(query) || text.toLowerCase().includes(query)
      )
    : false;
  return inId || inTitle || inTags || inContent || inSections;
}

function passesCatalogFilter(
  item: DecisionsCatalogItem,
  filter: ActorUseCaseMapFilter
): boolean {
  if (filter.status && filter.status !== 'all' && item.status !== filter.status) return false;
  if (filter.tag && !item.tags.includes(filter.tag)) return false;

  const query = filter.searchQuery?.trim().toLowerCase() ?? '';
  if (query && !matchesSearch(item, query)) return false;

  return true;
}

function isKindCompatible(kind: DocKind | 'all' | undefined): boolean {
  return kind === undefined || kind === 'all' || kind === 'actor' || kind === 'use_case';
}

export function buildActorUseCaseMap(
  catalog: DecisionsCatalog,
  filter: ActorUseCaseMapFilter = {}
): ActorUseCaseMapData {
  const kindFilterBlocksView = !isKindCompatible(filter.kind);

  if (kindFilterBlocksView) {
    return {
      byActor: [],
      byUseCase: [],
      orphanActors: [],
      orphanUseCases: [],
      linkCount: 0,
      kindFilterBlocksView: true,
    };
  }

  const actors = catalog.items.filter(
    item => item.kind === 'actor' && passesCatalogFilter(item, filter)
  );
  const useCases = catalog.items.filter(
    item => item.kind === 'use_case' && passesCatalogFilter(item, filter)
  );

  const visibleUseCaseIds = new Set(useCases.map(uc => uc.id));
  const visibleActorIds = new Set(actors.map(act => act.id));

  const byActor: ActorUseCaseRow[] = actors.map(actor => ({
    actor,
    useCases: (actor.relatedUseCases ?? []).filter(ref => visibleUseCaseIds.has(ref.id)),
  }));

  const byUseCase: UseCaseActorRow[] = useCases.map(useCase => ({
    useCase,
    actors: (useCase.relatedActors ?? []).filter(ref => visibleActorIds.has(ref.id)),
  }));

  const orphanActors = byActor.filter(row => row.useCases.length === 0).map(row => row.actor);
  const orphanUseCases = byUseCase.filter(row => row.actors.length === 0).map(row => row.useCase);

  const linkCount = byActor.reduce((sum, row) => sum + row.useCases.length, 0);

  return {
    byActor,
    byUseCase,
    orphanActors,
    orphanUseCases,
    linkCount,
    kindFilterBlocksView,
  };
}
