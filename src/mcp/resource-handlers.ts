import fs from 'node:fs';
import path from 'node:path';

export const MCP_DOC_URI_PREFIX = 'traceweave-doc://';

export interface McpDocResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export function listDocResources(docsDir: string): McpDocResource[] {
  const resolvedDocsDir = path.resolve(docsDir);
  const resources: McpDocResource[] = [];
  walkDocs(resolvedDocsDir, resolvedDocsDir, resources);
  return resources.sort((a, b) => a.uri.localeCompare(b.uri));
}

function walkDocs(rootDir: string, currentDir: string, resources: McpDocResource[]): void {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkDocs(rootDir, fullPath, resources);
      continue;
    }
    if (!entry.name.endsWith('.md')) {
      continue;
    }
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    resources.push({
      uri: `${MCP_DOC_URI_PREFIX}${relativePath}`,
      name: entry.name,
      description: `TraceWeave V-Model document: ${relativePath}`,
      mimeType: 'text/markdown',
    });
  }
}

export function readDocResource(
  docsDir: string,
  uri: string
): { uri: string; mimeType: string; text: string } {
  if (!uri.startsWith(MCP_DOC_URI_PREFIX)) {
    throw new Error(`Invalid resource URI scheme: ${uri}`);
  }
  const relativePath = uri.slice(MCP_DOC_URI_PREFIX.length);
  if (!relativePath || relativePath.includes('..')) {
    throw new Error(`Invalid resource path: ${uri}`);
  }

  const resolvedDocsDir = path.resolve(docsDir);
  const fullPath = path.resolve(resolvedDocsDir, relativePath);
  const relativeToDocs = path.relative(resolvedDocsDir, fullPath);
  if (relativeToDocs.startsWith('..') || path.isAbsolute(relativeToDocs)) {
    throw new Error(`Path traversal denied for resource: ${uri}`);
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    uri,
    mimeType: 'text/markdown',
    text: fs.readFileSync(fullPath, 'utf-8'),
  };
}

export function listDocResourceTemplates() {
  return [
    {
      uriTemplate: `${MCP_DOC_URI_PREFIX}{path}`,
      name: 'traceability-document',
      description: 'V-Model markdown document under docs/ (e.g. needs/NEED-0001.md)',
      mimeType: 'text/markdown',
    },
  ];
}
