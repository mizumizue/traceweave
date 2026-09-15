import { encodeCoverageFileKey } from '../../../core/coverage/CoverageDetailBuilder.js';
import type { CoverageFileDetailResponse } from '../../../core/coverage/CoverageDetailBuilder.js';

export async function fetchCoverageFileDetail(filePath: string): Promise<CoverageFileDetailResponse> {
  const encodedPath = encodeURIComponent(filePath);

  try {
    const res = await fetch(`/api/coverage/file?path=${encodedPath}`);
    if (res.ok) {
      return (await res.json()) as CoverageFileDetailResponse;
    }
  } catch {
    // fall through to static artifact
  }

  const key = encodeCoverageFileKey(filePath);
  const staticRes = await fetch(`coverage-files/${key}.json`);
  if (!staticRes.ok) {
    throw new Error(`Coverage detail not found for ${filePath}`);
  }

  const parsed = (await staticRes.json()) as CoverageFileDetailResponse | { lines?: unknown[]; filePath?: string };
  if ('source' in parsed && parsed.source) {
    return parsed as CoverageFileDetailResponse;
  }
  if ('lines' in parsed && Array.isArray(parsed.lines)) {
    return { source: parsed as CoverageFileDetailResponse['source'], testFiles: [] };
  }

  throw new Error(`Coverage detail not found for ${filePath}`);
}
