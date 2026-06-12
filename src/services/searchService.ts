import { AllanimeClient } from "@/api/allanimeClient.js";
import type { SearchItem, TranslationType } from "@/api/types.js";
import { normalizeCoverUrl } from "./assets.js";

export interface SearchOptions {
  query: string;
  page?: number;
  limit?: number;
  translationType?: TranslationType;
}

export async function searchTitles(client: AllanimeClient, options: SearchOptions): Promise<SearchItem[]> {
  const query = options.query.trim();
  if (!query) {
    return [];
  }

  const payload = await client.searchShowsGraphql({
    search: { query, isManga: true },
    limit: options.limit ?? 26,
    page: options.page ?? 1,
    translationType: options.translationType ?? "sub",
    countryOrigin: "ALL",
  });

  const result = extractShowItems(payload);

  return result.items.map(item => {
    const thumbnail = normalizeCoverUrl(item.thumbnail, 40) ?? item.thumbnail;
    const anilistId = extractAnilistId(thumbnail);
    return { ...item, thumbnail, anilistId };
  });
}

function extractAnilistId(thumbnail: string | undefined): number | undefined {
  if (!thumbnail) return undefined;
  const match = thumbnail.match(/\/bx(\d+)-/);
  return match ? parseInt(match[1], 10) : undefined;
}

function extractShowItems(payload: unknown): { items: SearchItem[] } {
  if (!payload || typeof payload !== "object") {
    return { items: [] };
  }

  const root = payload as Record<string, unknown>;
  const shows = root.shows;
  if (!shows || typeof shows !== "object") {
    return { items: [] };
  }

  const edges = (shows as Record<string, unknown>).edges;
  if (!Array.isArray(edges)) {
    return { items: [] };
  }

  const items: SearchItem[] = [];

  for (const edge of edges) {
      if (!edge || typeof edge !== "object") {
        continue;
      }

      const record = edge as Record<string, unknown>;
      const id = typeof record._id === "string" ? record._id : undefined;
      const title = typeof record.name === "string" ? record.name : undefined;
      if (!id || !title) {
        continue;
      }

      items.push({
        id,
        title,
        thumbnail: typeof record.thumbnail === "string" ? record.thumbnail : undefined,
      });
    }

  return { items };
}
