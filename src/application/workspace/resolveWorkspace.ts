import { ResolvedWorkspace } from '../../core/workspace/types.js';
import { loadWorkspaceConfig } from '../../infrastructure/workspace/loadWorkspaceConfig.js';
import { resolveWorkspaceRoot } from '../../infrastructure/workspace/resolveWorkspaceRoot.js';

export interface ResolveWorkspaceOptions {
  workspaceRoot?: string;
  startDir?: string;
}

export function resolveWorkspace(options: ResolveWorkspaceOptions = {}): ResolvedWorkspace {
  const workspaceRoot = resolveWorkspaceRoot({
    workspaceRoot: options.workspaceRoot,
    startDir: options.startDir,
  });
  return loadWorkspaceConfig(workspaceRoot);
}
