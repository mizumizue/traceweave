import React from 'react';
import { getRequirementClassMeta } from '../../../core/models/requirementClass.js';

interface RequirementClassBadgeProps {
  value?: string | null;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-[11px] px-2 py-0.5',
};

export function requirementClassBadgeClass(value?: string | null): string {
  if (value === 'non_functional') {
    return 'bg-amber-950/80 text-amber-200 border-amber-600/80';
  }
  if (value === 'functional') {
    return 'bg-emerald-950/80 text-emerald-200 border-emerald-600/80';
  }
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

export function RequirementClassBadge({
  value,
  showLabel = false,
  size = 'sm',
}: RequirementClassBadgeProps) {
  const meta = getRequirementClassMeta(value);
  if (!meta) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-bold uppercase tracking-wide ${SIZE_CLASSES[size]} ${requirementClassBadgeClass(meta.id)}`}
      title={`${meta.label} (${meta.labelEn})`}
    >
      <span>{meta.short}</span>
      {showLabel && <span className="normal-case tracking-normal font-semibold">{meta.label}</span>}
    </span>
  );
}
