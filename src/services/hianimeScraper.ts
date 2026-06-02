import { HiAnime } from "aniwatch";
import { extractStreamUrl } from "../player/ytdlp.js";
import type { EpisodeItem, StreamOption } from "../api/types.js";

const scraper = new HiAnime.Scraper();

export async function getHianimeIdFromTitle(title: string): Promise<string | null> {
  try {
    const results = await scraper.search(title, 1) as {
      mostPopularAnimes?: Array<{ id?: string }>;
    };
    const first = results?.mostPopularAnimes?.[0];
    return first?.id ?? null;
  } catch (err) {
    console.error("Hianime search error:", err);
    return null;
  }
}

export async function getHianimeEpisodes(hianimeId: string): Promise<EpisodeItem[]> {
  try {
    const result = await scraper.getEpisodes(hianimeId) as {
      episodes?: Array<{ number: number; title?: string; episodeId: string }>;
    };
    if (!result?.episodes) {
      return [];
    }

    return result.episodes.map(ep => ({
      id: String(ep.number),
      label: ep.title
        ? `Episode ${ep.number} - ${ep.title}`
        : `Episode ${ep.number}`,
    }));
  } catch (err) {
    console.error("Hianime episodes error:", err);
    return [];
  }
}

export async function getEpisodeIdFromNumber(
  hianimeId: string,
  episodeNumber: number,
): Promise<string | null> {
  try {
    const result = await scraper.getEpisodes(hianimeId) as {
      episodes?: Array<{ number: number; episodeId: string }>;
    };
    if (!result?.episodes) {
      return null;
    }

    const episode = result.episodes.find(ep => ep.number === episodeNumber);
    return episode?.episodeId ?? null;
  } catch (err) {
    console.error("Hianime getEpisodeIdFromNumber error:", err);
    return null;
  }
}

export async function getHianimeStreamForEpisode(
  hianimeId: string,
  episodeNumber: number,
  language: "sub" | "dub" = "sub",
): Promise<StreamOption[]> {
  const episodeId = await getEpisodeIdFromNumber(hianimeId, episodeNumber);
  if (!episodeId) {
    return [];
  }

  return getHianimeStream(episodeId, language);
}

export async function getHianimeStream(
  episodeId: string,
  language: "sub" | "dub" = "sub",
): Promise<StreamOption[]> {
  try {
    const servers = await scraper.getEpisodeServers(episodeId) as {
      sources?: { sources?: Array<{ url: string }> };
    };

    if (!servers?.sources?.sources?.[0]?.url) {
      return [];
    }

    const sourceUrl = servers.sources.sources[0].url;
    const extracted = await extractStreamUrl(sourceUrl, {
      referer: "https://megaplay.buzz",
    });

    if (extracted) {
      return [extracted];
    }

    return [
      {
        url: sourceUrl,
        qualityLabel: language === "dub" ? "Dub" : "Sub",
        referer: "https://megaplay.buzz",
        sourceName: "Hianime",
      },
    ];
  } catch (err) {
    console.error("Hianime getEpisodeServers error:", err);
    return [];
  }
}

export async function searchAndGetStreams(
  title: string,
  episodeNumber: number,
  language: "sub" | "dub" = "sub",
): Promise<StreamOption[]> {
  const hianimeId = await getHianimeIdFromTitle(title);
  if (!hianimeId) {
    return [];
  }

  return getHianimeStreamForEpisode(hianimeId, episodeNumber, language);
}