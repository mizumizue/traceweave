import React, { useState, useMemo } from 'react';
import {
  DecisionsCatalog,
  DecisionsCatalogItem,
  DocKind,
  DocStatus,
  DecisionsReferenceItem,
  UseCaseSufficiency,
} from '../../../core/models/types.js';
import { CircularGauge } from './CircularGauge.js';
import { matchesRequirementClassFilter, partitionByRequirementClass, REQUIREMENT_CLASS_META } from '../../../core/models/requirementClass.js';
import {
  GENERAL_GLOSSARY_DOMAINS,
  GLOSSARY_DOMAIN_META,
  GLOSSARY_SCOPES,
  GLOSSARY_SCOPE_META,
  matchesGlossaryDomainFilter,
  matchesGlossaryScopeFilter,
} from '../../../core/models/glossaryTaxonomy.js';
import type { GlossaryScope } from '../../../core/models/types.js';
import { GlossaryTaxonomyBadge } from './GlossaryTaxonomyBadge.js';
import { RequirementClassBadge } from './RequirementClassBadge.js';
import {
  Search,
  Filter,
  Tag,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Compass,
  FileText,
  UserCheck,
  Target,
  CheckSquare,
  FileCode,
  Box,
  Scale,
  ShieldCheck,
  HelpCircle,
  FlaskConical,
  RotateCcw,
  BookOpen,
  LayoutGrid,
  List,
  Sparkles,
  Link as LinkIcon,
  ArrowLeftRight,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ActorUseCaseMapGrouping,
  buildActorUseCaseMap,
} from '../utils/actorUseCaseMap.js';

interface DecisionsBrowserProps {
  catalog: DecisionsCatalog;
  useCaseSufficiencies?: UseCaseSufficiency[];
  onSelectNode: (id: string) => void;
  selectedKind?: DocKind | 'all';
  onKindChange?: (kind: DocKind | 'all') => void;
  selectedTag?: string | null;
  onTagChange?: (tag: string | null) => void;
  selectedStatus?: DocStatus | 'all';
  onStatusChange?: (status: DocStatus | 'all') => void;
  selectedRequirementClass?: string;
  onRequirementClassChange?: (requirementClass: string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  selectedGlossaryScope?: string;
  onGlossaryScopeChange?: (scope: string) => void;
  selectedGlossaryDomain?: string;
  onGlossaryDomainChange?: (domain: string) => void;
}

export const KIND_META: Record<
  DocKind,
  { label: string; short: string; color: string; badgeBg: string; border: string; icon: React.ReactNode }
> = {
  actor: {
    label: 'アクター (Actor)',
    short: 'ACT',
    color: 'text-violet-400',
    badgeBg: 'bg-violet-950/80 text-violet-300 border-violet-700/60',
    border: 'border-violet-800/40 hover:border-violet-500/80',
    icon: <UserCheck className="w-3.5 h-3.5 text-violet-400" />,
  },
  use_case: {
    label: 'ユースケース (Use Case)',
    short: 'UC',
    color: 'text-indigo-400',
    badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
    border: 'border-indigo-800/40 hover:border-indigo-500/80',
    icon: <Target className="w-3.5 h-3.5 text-indigo-400" />,
  },
  glossary: {
    label: '用語 (Glossary)',
    short: 'GLO',
    color: 'text-orange-400',
    badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-700/60',
    border: 'border-orange-800/40 hover:border-orange-500/80',
    icon: <BookOpen className="w-3.5 h-3.5 text-orange-400" />,
  },
  need: {
    label: '要求 (Need)',
    short: 'NEED',
    color: 'text-pink-400',
    badgeBg: 'bg-pink-950/80 text-pink-300 border-pink-700/60',
    border: 'border-pink-800/40 hover:border-pink-500/80',
    icon: <HelpCircle className="w-3.5 h-3.5 text-pink-400" />,
  },
  requirement: {
    label: '要件 (Requirement)',
    short: 'REQ',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    border: 'border-emerald-800/40 hover:border-emerald-500/80',
    icon: <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />,
  },
  specification: {
    label: '詳細仕様 (Specification)',
    short: 'SPEC',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
    border: 'border-cyan-800/40 hover:border-cyan-500/80',
    icon: <FileCode className="w-3.5 h-3.5 text-cyan-400" />,
  },
  design: {
    label: '設計事項 (Design)',
    short: 'DSN',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
    border: 'border-blue-800/40 hover:border-blue-500/80',
    icon: <Box className="w-3.5 h-3.5 text-blue-400" />,
  },
  decision: {
    label: '意思決定 (ADR)',
    short: 'ADR',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    border: 'border-amber-800/40 hover:border-amber-500/80',
    icon: <Scale className="w-3.5 h-3.5 text-amber-400" />,
  },
  quality_assurance: {
    label: '品質方針 (QA)',
    short: 'QA',
    color: 'text-teal-400',
    badgeBg: 'bg-teal-950/80 text-teal-300 border-teal-700/60',
    border: 'border-teal-800/40 hover:border-teal-500/80',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />,
  },
  test_case: {
    label: 'テストケース (Test Case)',
    short: 'TC',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
    border: 'border-purple-800/40 hover:border-purple-500/80',
    icon: <FlaskConical className="w-3.5 h-3.5 text-purple-400" />,
  },
};

function renderUseCaseSufficiencyBadge(sufficiency: UseCaseSufficiency | undefined) {
  if (!sufficiency || sufficiency.status === 'unassigned') {
    return (
      <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-lg px-2 py-0.5">
        要件未割当
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <CircularGauge value={sufficiency.score ?? 0} size={36} strokeWidth={3} />
      <span className="text-[10px] text-slate-400">
        {sufficiency.satisfiedRequirementCount}/{sufficiency.requirementRefCount} REQ
      </span>
    </div>
  );
}

export function DecisionsBrowser({
  catalog,
  useCaseSufficiencies = [],
  onSelectNode,
  selectedKind: selectedKindProp,
  onKindChange,
  selectedTag: selectedTagProp,
  onTagChange,
  selectedStatus: selectedStatusProp,
  onStatusChange,
  selectedRequirementClass: selectedRequirementClassProp,
  onRequirementClassChange,
  searchQuery: searchQueryProp,
  onSearchQueryChange,
  selectedGlossaryScope: selectedGlossaryScopeProp = 'all',
  onGlossaryScopeChange,
  selectedGlossaryDomain: selectedGlossaryDomainProp = 'all',
  onGlossaryDomainChange,
}: DecisionsBrowserProps) {
  const [internalKind, setInternalKind] = useState<DocKind | 'all'>(selectedKindProp ?? 'all');
  const [internalTag, setInternalTag] = useState<string | null>(selectedTagProp ?? null);
  const [internalStatus, setInternalStatus] = useState<DocStatus | 'all'>(selectedStatusProp ?? 'all');
  const [internalRequirementClass, setInternalRequirementClass] = useState(selectedRequirementClassProp ?? 'all');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'actor-uc-map'>('grid');
  const [mapGrouping, setMapGrouping] = useState<ActorUseCaseMapGrouping>('by-actor');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedKind = selectedKindProp !== undefined ? selectedKindProp : internalKind;
  const selectedTag = selectedTagProp !== undefined ? selectedTagProp : internalTag;
  const selectedStatus = selectedStatusProp !== undefined ? selectedStatusProp : internalStatus;
  const selectedRequirementClass =
    selectedRequirementClassProp !== undefined ? selectedRequirementClassProp : internalRequirementClass;
  const searchQuery = searchQueryProp !== undefined ? searchQueryProp : internalSearchQuery;
  const selectedGlossaryScope = selectedGlossaryScopeProp;
  const selectedGlossaryDomain = selectedGlossaryDomainProp;

  const handleSearchQueryChange = (query: string) => {
    setInternalSearchQuery(query);
    onSearchQueryChange?.(query);
  };

  const handleKindSelect = (kind: DocKind | 'all') => {
    setInternalKind(kind);
    onKindChange?.(kind);
  };

  const handleTagSelect = (tag: string | null) => {
    setInternalTag(tag);
    onTagChange?.(tag);
  };

  const handleStatusSelect = (status: DocStatus | 'all') => {
    setInternalStatus(status);
    onStatusChange?.(status);
  };

  const handleRequirementClassSelect = (requirementClass: string) => {
    setInternalRequirementClass(requirementClass);
    onRequirementClassChange?.(requirementClass);
  };

  const handleGlossaryScopeSelect = (scope: string) => {
    onGlossaryScopeChange?.(scope);
    if (scope === 'platform') {
      onGlossaryDomainChange?.('all');
    }
  };

  const handleGlossaryDomainSelect = (domain: string) => {
    onGlossaryDomainChange?.(domain);
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast.success(`IDをコピーしました: ${id}`);
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return catalog.items.filter(item => {
      if (selectedKind !== 'all' && item.kind !== selectedKind) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (selectedTag && !item.tags.includes(selectedTag)) return false;
      if (!matchesRequirementClassFilter(item, selectedRequirementClass)) return false;
      if (!matchesGlossaryScopeFilter(item, selectedGlossaryScope)) return false;
      if (!matchesGlossaryDomainFilter(item, selectedGlossaryDomain)) return false;

      if (query) {
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

        if (!inId && !inTitle && !inTags && !inContent && !inSections) return false;
      }

      return true;
    });
  }, [
    catalog.items,
    selectedKind,
    selectedStatus,
    selectedTag,
    selectedRequirementClass,
    selectedGlossaryScope,
    selectedGlossaryDomain,
    searchQuery,
  ]);

  const groupedItems = useMemo(() => partitionByRequirementClass(filteredItems), [filteredItems]);

  const useCaseSufficiencyById = useMemo(() => {
    const map = new Map<string, UseCaseSufficiency>();
    for (const entry of useCaseSufficiencies) {
      map.set(entry.useCaseId, entry);
    }
    return map;
  }, [useCaseSufficiencies]);

  const actorUseCaseMap = useMemo(
    () =>
      buildActorUseCaseMap(catalog, {
        searchQuery,
        status: selectedStatus,
        tag: selectedTag,
        kind: selectedKind,
      }),
    [catalog, searchQuery, selectedStatus, selectedTag, selectedKind]
  );

  const catalogById = useMemo(() => {
    const map = new Map<string, DecisionsCatalogItem>();
    for (const item of catalog.items) {
      map.set(item.id, item);
    }
    return map;
  }, [catalog.items]);

  const resetFilters = () => {
    handleKindSelect('all');
    handleTagSelect(null);
    handleStatusSelect('all');
    handleRequirementClassSelect('all');
    handleGlossaryScopeSelect('all');
    handleGlossaryDomainSelect('all');
    handleSearchQueryChange('');
    toast.info('決め事カタログのフィルターをリセットしました');
  };

  const glossaryCounts = catalog.glossaryTaxonomyCounts;
  const showGlossaryTaxonomyFilters =
    selectedKind === 'glossary' || selectedKind === 'all';

  const isFilterActive =
    selectedKind !== 'all' ||
    selectedTag !== null ||
    selectedStatus !== 'all' ||
    selectedRequirementClass !== 'all' ||
    selectedGlossaryScope !== 'all' ||
    selectedGlossaryDomain !== 'all' ||
    searchQuery.trim() !== '';

  const renderRefBadge = (ref: DecisionsReferenceItem, prefixIcon?: string) => {
    const meta = ref.kind ? KIND_META[ref.kind] : null;
    return (
      <button
        key={ref.id}
        onClick={e => {
          e.stopPropagation();
          onSelectNode(ref.id);
        }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition ${
          meta ? meta.badgeBg : 'bg-slate-800 text-slate-300 border-slate-700'
        } hover:brightness-125`}
        title={`${ref.title} (${ref.id})`}
      >
        <span>{prefixIcon || (meta?.short ? `[${meta.short}]` : '')}</span>
        <span className="font-bold">{ref.id}</span>
      </button>
    );
  };

  const renderParticipationLink = (
    ref: DecisionsReferenceItem,
    variant: 'use_case' | 'actor'
  ) => {
    const meta = KIND_META[variant];
    const item = catalogById.get(ref.id);
    const title = ref.title || item?.title || ref.id;
    const excerpt =
      variant === 'use_case'
        ? item?.sections?.Goal
        : item?.sections?.Role || ref.role;

    return (
      <button
        key={ref.id}
        type="button"
        onClick={e => {
          e.stopPropagation();
          onSelectNode(ref.id);
        }}
        className={`w-full text-left rounded-xl border p-3 transition hover:bg-slate-950/90 ${meta.border} bg-slate-950/40 group`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${meta.badgeBg}`}
          >
            {meta.icon}
            <span>{meta.short}</span>
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-400 group-hover:text-slate-200 transition">
            {ref.id}
          </span>
        </div>
        <div className="mt-1.5 text-sm font-semibold text-slate-100 group-hover:text-indigo-200 transition leading-snug">
          {title}
        </div>
        {excerpt && (
          <p className="mt-1 text-[11px] text-slate-400 leading-relaxed line-clamp-2">{excerpt}</p>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview & Statistics Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-900/30">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">
                アプリケーションの決め事カタログ (Architecture & Decisions)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              要件・仕様・ユースケース・アクター・用語・設計・意思決定（ADR）・品質方針など、システムの決め事を横断的に探索・相互参照できます。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleKindSelect(selectedKind === 'glossary' ? 'all' : 'glossary')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
                selectedKind === 'glossary'
                  ? 'bg-orange-950/80 text-orange-200 border-orange-600/60 ring-2 ring-orange-400/40'
                  : 'bg-slate-950/60 text-slate-300 border-slate-700 hover:border-orange-700/60 hover:text-orange-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              用語集 ({catalog.kindCounts.glossary || 0})
            </button>
            <span className="text-xs text-slate-400 font-medium">登録ドキュメント総数:</span>
            <span className="px-3 py-1 bg-indigo-950 border border-indigo-700 text-indigo-300 font-bold font-mono text-sm rounded-xl shadow-inner">
              {catalog.totalCount} 件
            </span>
          </div>
        </div>

        {/* Kind breakdown counts */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 mt-4">
          {(Object.keys(KIND_META) as DocKind[]).map(kind => {
            const meta = KIND_META[kind];
            const count = catalog.kindCounts[kind] || 0;
            const isSelected = selectedKind === kind;
            return (
              <button
                key={kind}
                onClick={() => handleKindSelect(isSelected ? 'all' : kind)}
                className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? `${meta.badgeBg} shadow-md ring-2 ring-indigo-400/50 scale-[1.02]`
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1 truncate">
                    {meta.icon}
                    <span className="truncate">{meta.short}</span>
                  </span>
                </div>
                <div className="text-base font-bold font-mono mt-1 text-slate-100">{count}</div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">要件区分:</span>
          <button
            onClick={() => {
              handleKindSelect('requirement');
              handleRequirementClassSelect(selectedRequirementClass === 'functional' ? 'all' : 'functional');
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
              selectedRequirementClass === 'functional'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-600'
                : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-emerald-700'
            }`}
          >
            FR 機能要件
            <span className="ml-1.5 font-mono">{catalog.requirementClassCounts?.functional ?? 0}</span>
          </button>
          <button
            onClick={() => {
              handleKindSelect('requirement');
              handleRequirementClassSelect(selectedRequirementClass === 'non_functional' ? 'all' : 'non_functional');
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
              selectedRequirementClass === 'non_functional'
                ? 'bg-amber-950 text-amber-200 border-amber-600'
                : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-amber-700'
            }`}
          >
            NFR 非機能要件
            <span className="ml-1.5 font-mono">{catalog.requirementClassCounts?.non_functional ?? 0}</span>
          </button>
        </div>

        {showGlossaryTaxonomyFilters && (catalog.kindCounts.glossary || 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-indigo-900/30 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                用語の境界:
              </span>
              <button
                type="button"
                onClick={() => {
                  handleKindSelect('glossary');
                  handleGlossaryScopeSelect('all');
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  selectedGlossaryScope === 'all'
                    ? 'bg-orange-950/80 text-orange-200 border-orange-600/60'
                    : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-orange-700/60'
                }`}
              >
                用語 すべて
                <span className="ml-1.5 font-mono">{catalog.kindCounts.glossary || 0}</span>
              </button>
              {(GLOSSARY_SCOPES as readonly GlossaryScope[]).map(scope => {
                const meta = GLOSSARY_SCOPE_META[scope];
                const count = glossaryCounts?.byScope[scope] ?? 0;
                const active = selectedGlossaryScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => {
                      handleKindSelect('glossary');
                      handleGlossaryScopeSelect(active ? 'all' : scope);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                      active
                        ? 'bg-orange-950/80 text-orange-200 border-orange-600/60'
                        : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-orange-700/60'
                    }`}
                  >
                    {meta.label}
                    <span className="ml-1.5 font-mono">{count}</span>
                  </button>
                );
              })}
            </div>

            {selectedGlossaryScope !== 'platform' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  一般用語の文脈:
                </span>
                <button
                  type="button"
                  onClick={() => handleGlossaryDomainSelect('all')}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                    selectedGlossaryDomain === 'all'
                      ? 'bg-indigo-950 text-indigo-200 border-indigo-600'
                      : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-indigo-700'
                  }`}
                >
                  すべて
                </button>
                {GENERAL_GLOSSARY_DOMAINS.map(domain => {
                  const meta = GLOSSARY_DOMAIN_META[domain];
                  const count = glossaryCounts?.byDomain[domain] ?? 0;
                  if (count === 0) return null;
                  const active = selectedGlossaryDomain === domain;
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => {
                        handleKindSelect('glossary');
                        handleGlossaryScopeSelect(
                          selectedGlossaryScope === 'platform' ? 'general' : selectedGlossaryScope
                        );
                        handleGlossaryDomainSelect(active ? 'all' : domain);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                        active
                          ? 'bg-indigo-950 text-indigo-200 border-indigo-600'
                          : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-indigo-700'
                      }`}
                    >
                      {meta.label}
                      <span className="ml-1 font-mono text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Keyword Search */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="決め事のID、タイトル、本文、タグで横断検索..."
              value={searchQuery}
              onChange={e => handleSearchQueryChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchQueryChange('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Controls: Kind, Status, View mode, Reset */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Kind Select */}
            <select
              value={selectedKind}
              onChange={e => handleKindSelect(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="all">すべての種別 (All Kinds)</option>
              {(Object.keys(KIND_META) as DocKind[]).map(kind => (
                <option key={kind} value={kind}>
                  {KIND_META[kind].label} ({catalog.kindCounts[kind] || 0})
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={selectedStatus}
              onChange={e => handleStatusSelect(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">すべてのステータス</option>
              <option value="accepted">Accepted (採択)</option>
              <option value="draft">Draft (起草中)</option>
              <option value="proposed">Proposed (提案)</option>
              <option value="deprecated">Deprecated (非推奨)</option>
            </select>

            <select
              value={selectedRequirementClass}
              onChange={e => handleRequirementClassSelect(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="all">すべての要件区分</option>
              <option value="functional">機能要件 (FR)</option>
              <option value="non_functional">非機能要件 (NFR)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === 'grid'
                    ? 'bg-indigo-900/60 text-indigo-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="カードグリッド表示"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === 'table'
                    ? 'bg-indigo-900/60 text-indigo-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="テーブル一覧表示"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('actor-uc-map')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === 'actor-uc-map'
                    ? 'bg-violet-900/60 text-violet-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Actor ↔ UseCase 参加関係マップ"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reset */}
            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                リセット
              </button>
            )}
          </div>
        </div>

        {/* Popular Tags Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
            <Tag className="w-3 h-3 text-indigo-400" />
            タグ:
          </span>
          {catalog.allTags.slice(0, 16).map(({ tag, count }) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagSelect(isSelected ? null : tag)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition border ${
                  isSelected
                    ? 'bg-indigo-950 border-indigo-600 text-indigo-200 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                #{tag} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
          {selectedTag && (
            <button
              onClick={() => handleTagSelect(null)}
              className="text-[10px] text-indigo-400 hover:underline ml-2"
            >
              タグ解除 ✕
            </button>
          )}
        </div>
      </div>

      {/* Result Count and Active Filters Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          {viewMode === 'actor-uc-map' ? (
            <>
              参加関係:{' '}
              <span className="font-bold text-slate-200">
                ACT {actorUseCaseMap.byActor.length} / UC {actorUseCaseMap.byUseCase.length}
              </span>
              <span className="ml-2 font-mono text-[11px] text-violet-400">
                [リンク {actorUseCaseMap.linkCount}]
              </span>
            </>
          ) : (
            <>
              該当ドキュメント: <span className="font-bold text-slate-200">{filteredItems.length}</span> 件
            </>
          )}
          {selectedKind !== 'all' && (
            <span className="ml-2 font-mono text-[11px] text-indigo-400">
              [種別: {KIND_META[selectedKind].label}]
            </span>
          )}
          {selectedRequirementClass !== 'all' && (
            <span className="ml-2 font-mono text-[11px] text-indigo-400">
              [区分: {REQUIREMENT_CLASS_META[selectedRequirementClass as 'functional' | 'non_functional']?.label}]
            </span>
          )}
          {selectedTag && (
            <span className="ml-2 font-mono text-[11px] text-indigo-400">[タグ: #{selectedTag}]</span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          {viewMode === 'actor-uc-map'
            ? 'Actor と UseCase の参加関係を一覧表示します。ノードをクリックすると詳細モーダルが開きます'
            : 'カードをクリックすると詳細モーダルが開き、相互参照を探索できます'}
        </div>
      </div>

      {/* Empty State */}
      {viewMode === 'actor-uc-map' ? (
        actorUseCaseMap.kindFilterBlocksView ? (
          <div className="bg-slate-900/50 border border-amber-900/40 rounded-2xl p-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <div className="text-base font-bold text-slate-300">
              現在の種別フィルターでは Actor ↔ UseCase マップを表示できません
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              種別を「すべて」「アクター」「ユースケース」のいずれかに変更するか、フィルターをリセットしてください。
            </p>
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              フィルターをリセット
            </button>
          </div>
        ) : actorUseCaseMap.byActor.length === 0 && actorUseCaseMap.byUseCase.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <div className="text-4xl">🔍</div>
            <div className="text-base font-bold text-slate-300">
              条件に一致するアクターまたはユースケースが見つかりませんでした
            </div>
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              フィルターをリセット
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-slate-900 border border-violet-900/40 rounded-2xl p-4 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <ArrowLeftRight className="w-4 h-4 text-violet-400" />
                    <span>Actor ↔ UseCase 参加関係マップ</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    各アクターが関与するユースケース、および各ユースケースに参加するアクターを一覧表示します。
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-lg bg-violet-950/80 border border-violet-800/60 text-violet-200 font-mono">
                    ACT {actorUseCaseMap.byActor.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-200 font-mono">
                    UC {actorUseCaseMap.byUseCase.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 font-mono">
                    リンク {actorUseCaseMap.linkCount}
                  </span>
                  {(actorUseCaseMap.orphanActors.length > 0 ||
                    actorUseCaseMap.orphanUseCases.length > 0) && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-200 font-mono flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      孤立 {actorUseCaseMap.orphanActors.length + actorUseCaseMap.orphanUseCases.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-violet-900/30">
                <span className="text-[11px] text-slate-400 font-semibold">表示起点:</span>
                <button
                  onClick={() => setMapGrouping('by-actor')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                    mapGrouping === 'by-actor'
                      ? 'bg-violet-950 text-violet-200 border-violet-600'
                      : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-violet-700'
                  }`}
                >
                  アクター起点
                </button>
                <button
                  onClick={() => setMapGrouping('by-use-case')}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                    mapGrouping === 'by-use-case'
                      ? 'bg-indigo-950 text-indigo-200 border-indigo-600'
                      : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-indigo-700'
                  }`}
                >
                  ユースケース起点
                </button>
              </div>
            </div>

            {mapGrouping === 'by-actor' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {actorUseCaseMap.byActor.map(row => {
                  const meta = KIND_META.actor;
                  const isOrphan = row.useCases.length === 0;
                  return (
                    <div
                      key={row.actor.id}
                      className={`bg-slate-900/70 border rounded-2xl p-4 shadow-md ${
                        isOrphan ? 'border-amber-800/50' : meta.border
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectNode(row.actor.id)}
                        className="w-full text-left space-y-2 group"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${meta.badgeBg}`}
                          >
                            {meta.icon}
                            <span>{meta.short}</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-violet-200 transition">
                            {row.actor.id}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-violet-200 transition">
                          {row.actor.title}
                        </h3>
                        {row.actor.sections?.Role && (
                          <p className="text-xs text-slate-400 line-clamp-2">{row.actor.sections.Role}</p>
                        )}
                      </button>
                      <div className="mt-3 pt-3 border-t border-slate-800/60">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Target className="w-2.5 h-2.5 text-indigo-400" />
                          <span>関与ユースケース ({row.useCases.length})</span>
                        </div>
                        {isOrphan ? (
                          <div className="text-[11px] text-amber-300 flex items-center gap-1.5 bg-amber-950/30 border border-amber-900/40 rounded-lg px-2.5 py-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>紐付けられたユースケースがありません</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {row.useCases.map(ref => renderParticipationLink(ref, 'use_case'))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {actorUseCaseMap.byUseCase.map(row => {
                  const meta = KIND_META.use_case;
                  const isOrphan = row.actors.length === 0;
                  const ucSufficiency = useCaseSufficiencyById.get(row.useCase.id);
                  return (
                    <div
                      key={row.useCase.id}
                      className={`bg-slate-900/70 border rounded-2xl p-4 shadow-md ${
                        isOrphan ? 'border-amber-800/50' : meta.border
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectNode(row.useCase.id)}
                        className="w-full text-left space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${meta.badgeBg}`}
                          >
                            {meta.icon}
                            <span>{meta.short}</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-indigo-200 transition">
                            {row.useCase.id}
                          </span>
                          </div>
                          <div className="shrink-0">{renderUseCaseSufficiencyBadge(ucSufficiency)}</div>
                        </div>
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-200 transition">
                          {row.useCase.title}
                        </h3>
                        {row.useCase.sections?.Goal && (
                          <p className="text-xs text-slate-400 line-clamp-2">{row.useCase.sections.Goal}</p>
                        )}
                      </button>
                      <div className="mt-3 pt-3 border-t border-slate-800/60">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5 text-violet-400" />
                          <span>参加アクター ({row.actors.length})</span>
                        </div>
                        {isOrphan ? (
                          <div className="text-[11px] text-amber-300 flex items-center gap-1.5 bg-amber-950/30 border border-amber-900/40 rounded-lg px-2.5 py-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>actor_refs が未設定です</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {row.actors.map(ref => renderParticipationLink(ref, 'actor'))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <div className="text-base font-bold text-slate-300">
            条件に一致する決め事ドキュメントが見つかりませんでした
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            検索キーワード「{searchQuery}」や種別・タグフィルターの条件を変更してください。
          </p>
          <button
            onClick={resetFilters}
            className="mt-2 px-4 py-2 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            フィルターをリセットして全件表示
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...groupedItems.functional, ...groupedItems.non_functional, ...groupedItems.other].map(item => {
            const meta = KIND_META[item.kind];
            const hasCrossRefs =
              (item.relatedActors && item.relatedActors.length > 0) ||
              (item.relatedUseCases && item.relatedUseCases.length > 0) ||
              (item.relatedReqs && item.relatedReqs.length > 0) ||
              (item.relatedSpecs && item.relatedSpecs.length > 0) ||
              (item.relatedDesigns && item.relatedDesigns.length > 0) ||
              (item.relatedDecisions && item.relatedDecisions.length > 0) ||
              (item.relatedTestCases && item.relatedTestCases.length > 0) ||
              (item.relatedGlossary && item.relatedGlossary.length > 0);

            // Preview excerpt from main section
            const excerpt =
              item.sections?.['Role'] ||
              item.sections?.['Definition'] ||
              item.sections?.['Statement'] ||
              item.sections?.['Decision'] ||
              item.sections?.['Goal'] ||
              item.sections?.['Background'] ||
              item.sections?.['Contract'] ||
              item.sections?.['Objective'] ||
              item.content.slice(0, 160);

            return (
              <React.Fragment key={item.id}>
                {groupedItems.functional[0]?.id === item.id && (
                  <div className="col-span-full flex items-center gap-2 pt-1">
                    <RequirementClassBadge value="functional" showLabel size="md" />
                    <span className="text-xs font-bold text-emerald-200">
                      {REQUIREMENT_CLASS_META.functional.label} ({groupedItems.functional.length})
                    </span>
                  </div>
                )}
                {groupedItems.non_functional[0]?.id === item.id && (
                  <div className="col-span-full flex items-center gap-2 pt-1">
                    <RequirementClassBadge value="non_functional" showLabel size="md" />
                    <span className="text-xs font-bold text-amber-200">
                      {REQUIREMENT_CLASS_META.non_functional.label} ({groupedItems.non_functional.length})
                    </span>
                  </div>
                )}
                {groupedItems.other[0]?.id === item.id &&
                  (groupedItems.functional.length > 0 || groupedItems.non_functional.length > 0) && (
                    <div className="col-span-full text-xs font-bold text-slate-400 uppercase tracking-wider pt-1">
                      その他の決め事 ({groupedItems.other.length})
                    </div>
                  )}
              <div
                key={item.id}
                onClick={() => onSelectNode(item.id)}
                className={`bg-slate-900/70 border rounded-2xl p-4 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer group ${meta.border} hover:bg-slate-900`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Kind Badge, ID, Status, Copy */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${meta.badgeBg}`}
                      >
                        {meta.icon}
                        <span>{meta.short}</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-300 group-hover:text-white transition">
                        {item.id}
                      </span>
                      {item.kind === 'requirement' && (
                        <RequirementClassBadge value={item.requirement_class} />
                      )}
                      {item.kind === 'glossary' && (
                        <GlossaryTaxonomyBadge
                          scope={item.glossary_scope}
                          domain={item.glossary_domain}
                          compact
                        />
                      )}
                      <button
                        onClick={e => handleCopyId(e, item.id)}
                        className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition opacity-0 group-hover:opacity-100"
                        title="IDをコピー"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                        item.status === 'accepted'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Excerpt */}
                  {excerpt && (
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                      {excerpt}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 4).map(t => (
                        <span
                          key={t}
                          onClick={e => {
                            e.stopPropagation();
                            handleTagSelect(t);
                          }}
                          className="px-1.5 py-0.2 bg-slate-950/80 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-700 text-[10px] font-mono text-slate-400 hover:text-indigo-300 rounded transition cursor-pointer"
                        >
                          #{t}
                        </span>
                      ))}
                      {item.tags.length > 4 && (
                        <span className="text-[10px] text-slate-500 self-center">
                          +{item.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Cross References Section */}
                <div className="pt-3 mt-3 border-t border-slate-800/60 space-y-2">
                  {hasCrossRefs ? (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <LinkIcon className="w-2.5 h-2.5 text-indigo-400" />
                        <span>関連決め事 (Cross References)</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {/* Actors */}
                        {item.relatedActors?.map(ref => renderRefBadge(ref, '👤'))}
                        {/* Use Cases */}
                        {item.relatedUseCases?.map(ref => renderRefBadge(ref, '🎯'))}
                        {/* Decisions (ADR) */}
                        {item.relatedDecisions?.map(ref => renderRefBadge(ref, '⚖️'))}
                        {/* Designs (DSN) */}
                        {item.relatedDesigns?.map(ref => renderRefBadge(ref, '🏗️'))}
                        {/* Requirements */}
                        {item.relatedReqs?.slice(0, 2).map(ref => renderRefBadge(ref, '📋'))}
                        {/* Specifications */}
                        {item.relatedSpecs?.slice(0, 2).map(ref => renderRefBadge(ref, '📐'))}
                        {/* Test Cases */}
                        {item.relatedTestCases?.slice(0, 2).map(ref => renderRefBadge(ref, '🧪'))}
                        {item.relatedGlossary?.slice(0, 3).map(ref => renderRefBadge(ref, '📖'))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600 font-mono flex items-center justify-between">
                      <span>独立文書 (Root Definition)</span>
                      <span className="text-slate-500 group-hover:text-indigo-400 transition flex items-center gap-0.5">
                        詳細 <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase text-slate-400 font-semibold tracking-wider">
                  <th className="py-3 px-4 w-28">種別</th>
                  <th className="py-3 px-4 w-32">ID</th>
                  <th className="py-3 px-4 w-24">区分</th>
                  <th className="py-3 px-4">タイトル / 概要</th>
                  <th className="py-3 px-4 w-52">関連決め事</th>
                  <th className="py-3 px-4 w-36">タグ</th>
                  <th className="py-3 px-4 w-24 text-center">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[...groupedItems.functional, ...groupedItems.non_functional, ...groupedItems.other].map(item => {
                  const meta = KIND_META[item.kind];
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectNode(item.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition group"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1 ${meta.badgeBg}`}
                        >
                          {meta.icon}
                          <span>{meta.short}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-300 group-hover:text-indigo-300 transition">
                        {item.id}
                      </td>
                      <td className="py-3 px-4">
                        {item.kind === 'requirement' ? (
                          <RequirementClassBadge value={item.requirement_class} showLabel />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200 group-hover:text-indigo-200 transition">
                          {item.title}
                        </div>
                        {item.sections?.['Role'] && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            役割: {item.sections['Role']}
                          </div>
                        )}
                        {item.sections?.['Definition'] && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            定義: {item.sections['Definition']}
                          </div>
                        )}
                        {item.sections?.['Decision'] && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            決定: {item.sections['Decision']}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.relatedActors?.map(ref => renderRefBadge(ref, '👤'))}
                          {item.relatedUseCases?.map(ref => renderRefBadge(ref, '🎯'))}
                          {item.relatedDecisions?.map(ref => renderRefBadge(ref, '⚖️'))}
                          {item.relatedDesigns?.map(ref => renderRefBadge(ref, '🏗️'))}
                          {item.relatedReqs?.slice(0, 2).map(ref => renderRefBadge(ref, '📋'))}
                          {item.relatedSpecs?.slice(0, 2).map(ref => renderRefBadge(ref, '📐'))}
                          {item.relatedGlossary?.slice(0, 2).map(ref => renderRefBadge(ref, '📖'))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map(t => (
                            <span
                              key={t}
                              className="px-1.5 py-0.2 bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 rounded"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                            item.status === 'accepted'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
