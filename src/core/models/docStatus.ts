import { DocNode, DocStatus } from './types.js';

const INACTIVE_STATUSES: ReadonlySet<DocStatus> = new Set(['deprecated', 'superseded']);

export function isActiveDocStatus(status: DocStatus | undefined): boolean {
  return status !== undefined && !INACTIVE_STATUSES.has(status);
}

export function isActiveRequirement(node: DocNode | undefined): boolean {
  return node?.kind === 'requirement' && isActiveDocStatus(node.status);
}
