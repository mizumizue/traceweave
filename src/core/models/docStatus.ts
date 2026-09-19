import { DocNode, DocStatus } from './types.js';

const INACTIVE_STATUSES: ReadonlySet<DocStatus> = new Set(['deprecated', 'superseded']);

export function isRetiredDocStatus(status: unknown): boolean {
  return status === 'deprecated' || status === 'superseded';
}

export function isActiveDocStatus(status: DocStatus | undefined): boolean {
  return status !== undefined && !INACTIVE_STATUSES.has(status);
}

export function isActiveRequirement(node: DocNode | undefined): boolean {
  return node?.kind === 'requirement' && isActiveDocStatus(node.status);
}

/** Active test_case docs participate in matrix, catalog, and graph (ADR-0010 split parents are excluded). */
export function isActiveTestCase(node: DocNode | undefined): boolean {
  return node?.kind === 'test_case' && !isRetiredDocStatus(node.status);
}
