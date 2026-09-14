import type { DocKind, RequirementClass, RequirementClassCounts } from './types.js';

export const REQUIREMENT_CLASSES: readonly RequirementClass[] = ['functional', 'non_functional'] as const;

export const REQUIREMENT_CLASS_META: Record<
  RequirementClass,
  { id: RequirementClass; short: string; label: string; labelEn: string }
> = {
  functional: {
    id: 'functional',
    short: 'FR',
    label: '機能要件',
    labelEn: 'Functional',
  },
  non_functional: {
    id: 'non_functional',
    short: 'NFR',
    label: '非機能要件',
    labelEn: 'Non-Functional',
  },
};

export function isRequirementClass(value: unknown): value is RequirementClass {
  return value === 'functional' || value === 'non_functional';
}

export function resolveRequirementClass(value: unknown): RequirementClass | undefined {
  return isRequirementClass(value) ? value : undefined;
}

export function getRequirementClassMeta(value: unknown) {
  const resolved = resolveRequirementClass(value);
  return resolved ? REQUIREMENT_CLASS_META[resolved] : undefined;
}

export function countRequirementClasses(
  items: Array<{ kind?: DocKind; requirement_class?: unknown; requirementClass?: unknown }>
): RequirementClassCounts {
  const counts: RequirementClassCounts = {
    functional: 0,
    non_functional: 0,
    unclassified: 0,
  };

  for (const item of items) {
    if (item.kind !== 'requirement') {
      continue;
    }
    const cls = resolveRequirementClass(item.requirement_class ?? item.requirementClass);
    if (cls === 'functional') counts.functional += 1;
    else if (cls === 'non_functional') counts.non_functional += 1;
    else counts.unclassified += 1;
  }

  return counts;
}

export function matchesRequirementClassFilter(
  item: { kind?: DocKind; requirement_class?: unknown; requirementClass?: unknown },
  filter?: RequirementClass | 'all' | string | null
): boolean {
  if (!filter || filter === 'all') {
    return true;
  }
  if (item.kind && item.kind !== 'requirement') {
    return true;
  }
  const cls = resolveRequirementClass(item.requirement_class ?? item.requirementClass);
  return cls === filter;
}

export interface RequirementClassPartition<T> {
  functional: T[];
  non_functional: T[];
  other: T[];
}

export function partitionByRequirementClass<
  T extends { kind?: DocKind; requirement_class?: unknown; requirementClass?: unknown },
>(items: T[]): RequirementClassPartition<T> {
  const partition: RequirementClassPartition<T> = {
    functional: [],
    non_functional: [],
    other: [],
  };

  for (const item of items) {
    if (item.kind === 'requirement') {
      const cls = resolveRequirementClass(item.requirement_class ?? item.requirementClass);
      if (cls === 'functional') partition.functional.push(item);
      else if (cls === 'non_functional') partition.non_functional.push(item);
      else partition.other.push(item);
    } else {
      partition.other.push(item);
    }
  }

  return partition;
}
