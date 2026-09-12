import { DocNode } from '../../../core/models/types.js';

export interface ModalHistoryState {
  history: string[];
  index: number;
}

export function appendModalHistory(
  state: ModalHistoryState,
  nodeId: string
): ModalHistoryState {
  if (state.history[state.index] === nodeId) {
    return state;
  }
  return {
    history: [...state.history.slice(0, state.index + 1), nodeId],
    index: state.index + 1,
  };
}

export function moveModalHistory(
  state: ModalHistoryState,
  direction: 'back' | 'forward'
): ModalHistoryState {
  const delta = direction === 'back' ? -1 : 1;
  return {
    ...state,
    index: Math.max(0, Math.min(state.history.length - 1, state.index + delta)),
  };
}

export function isModalEscapeKey(key: string): boolean {
  return key === 'Escape';
}

export function isModalOverlayClick(target: EventTarget | null, currentTarget: EventTarget | null): boolean {
  return target === currentTarget;
}

export type NodeCopyTarget = 'id' | 'filePath' | 'markdown';

export function getNodeCopyText(node: DocNode, target: NodeCopyTarget): string {
  if (target === 'id') return node.id;
  if (target === 'filePath') return node.filePath || node.id;
  return `# ${node.id}: ${node.title}\n\n${node.content}`;
}
