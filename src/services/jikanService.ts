export interface AnimeMetadata {
  title: string;
  coverUrl?: string;
  synopsis?: string;
  score?: number;
  status?: string;
  genres?: string[];
  episodes?: number;
  year?: number;
}

async function searchJikan(title: string): Promise<AnimeMetadata | undefined> {
  const q = encodeURIComponent(title.trim());
  if (!q) return undefined;
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${q}&limit=1`);
    if (!response.ok) return undefined;
    const json = (await response.json()) as any;
    if (!json.data || json.data.length === 0) return undefined;
    const item = json.data[0];
    return {
      title: item.title,
      coverUrl: item.images?.jpg?.large_image_url || item.images?.webp?.large_image_url,
      synopsis: item.synopsis,
      score: item.score,
      status: item.status,
      genres: item.genres?.map((g: any) => g.name),
      episodes: item.episodes,
      year: item.year || item.aired?.prop?.from?.year,
    };
  } catch {
    return undefined;
  }
}

function wordOverlap(resultTitle: string, query: string): number {
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean));
  const resultWords = words(resultTitle);
  let matches = 0;
  for (const w of words(query)) if (resultWords.has(w)) matches++;
  return matches;
}

export async function fetchJikanMetadata(animeTitle: string, userQuery?: string): Promise<AnimeMetadata | undefined> {
  const primary = await searchJikan(animeTitle);

  if (!userQuery || userQuery.toLowerCase() === animeTitle.toLowerCase()) {
    return primary;
  }

  // Primary result is relevant — no need to hit Jikan again
  if (primary && wordOverlap(primary.title, userQuery) > 0) {
    return primary;
  }

  // Primary missing or clearly wrong (0 overlap with user query) — try user query
  const fallback = await searchJikan(userQuery);
  return fallback ?? primary;
}
