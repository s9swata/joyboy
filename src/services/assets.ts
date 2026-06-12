import { ASSET_CDN_BASE, MANGA_CDN_BASE } from "@/api/constants.js";

const COVER_REGEX = /(\d+)\.(jpg|png|webp)$/i;

export function resolveMangaPage(path: string): string {
  return `${MANGA_CDN_BASE}/${path.replace(/^\/+/, "")}`;
}

export function normalizeCoverUrl(rawPath: string | undefined, width: 250 | 40 = 250): string | undefined {
  if (!rawPath) {
    return undefined;
  }

  if (rawPath.startsWith("http")) {
    return rawPath;
  }

  const normalized = rawPath.replace(COVER_REGEX, (_match, _number, ext: string) => `001.${ext}`);
  return `${ASSET_CDN_BASE}/${normalized.replace(/^\/+/, "")}?w=${width}`;
}

export function fallbackCoverUrl(rawPath: string | undefined, width: 250 | 40 = 40): string | undefined {
  if (!rawPath) {
    return undefined;
  }

  if (rawPath.startsWith("http")) {
    return rawPath;
  }

  return `${ASSET_CDN_BASE}/${rawPath.replace(/^\/+/, "")}?w=${width}`;
}
