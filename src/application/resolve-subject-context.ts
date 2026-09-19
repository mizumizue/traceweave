import path from 'node:path';
import { SubjectContext, SubjectSource } from '../core/models/types.js';
import { resolvePackageDisplayName } from './resolve-package-display-name.js';
import { readWorkspaceConfigFile } from '../infrastructure/workspace/loadWorkspaceConfig.js';

export interface ResolveSubjectContextOptions {
  repoRoot: string;
  cliSubject?: string;
}

function nonEmpty(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function fromSource(displayName: string, source: SubjectSource): SubjectContext {
  return { displayName, source };
}

export function resolveSubjectContext(options: ResolveSubjectContextOptions): SubjectContext {
  const repoRoot = path.resolve(options.repoRoot);

  const cliName = nonEmpty(options.cliSubject);
  if (cliName) return fromSource(cliName, 'cli');

  const envName = nonEmpty(process.env.TRACEWEAVE_SUBJECT);
  if (envName) return fromSource(envName, 'env');

  const config = readWorkspaceConfigFile(repoRoot);
  const configName = nonEmpty(config?.displayName);
  if (configName) return fromSource(configName, 'config');

  const packageName = resolvePackageDisplayName(repoRoot);
  if (packageName) return fromSource(packageName, 'package_json');

  const directoryName = nonEmpty(path.basename(repoRoot));
  if (directoryName) return fromSource(directoryName, 'directory');

  return fromSource('unknown-project', 'directory');
}
