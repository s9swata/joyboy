import { AllanimeClient } from "@/api/allanimeClient.js";
import type { EpisodeItem } from "@/api/types.js";
import type { AnimeWatchData } from "@/services/watchHistory.js";
import type { AppState } from "./useAppState.js";

const client = new AllanimeClient();
type S = AppState;

export async function runSearch(s: S, searchValue: string): Promise<void> {
  if (!searchValue.trim()) return;
  s.setLoading(true); s.setLoadingLabel("Searching titles..."); s.setError(null); s.setStatus(null);
  try {
    const { searchTitles } = await import("@/services/searchService.js");
    const found = await searchTitles(client, { query: searchValue });
    s.setItems(found); s.setSelectedSearchIndex(0); s.setEpisodes([]); s.setStreams([]); s.setScreen("results");
  } catch (e) {
    s.setError(e instanceof Error ? e.message : "Unknown search error");
  } finally {
    s.setLoading(false); s.setLoadingLabel(null);
  }
}

export async function loadEpisodes(s: S): Promise<void> {
  const title = s.selectedTitle;
  if (!title) return;
  s.setLoading(true); s.setLoadingLabel("Loading episodes and cover..."); s.setError(null); s.setStatus(null); s.setCoverImage(null);
  try {
    const { fetchEpisodes } = await import("@/services/animeService.js");
    const { fetchAniListMetadata, fetchAniListMetadataByTitle } = await import("@/services/anilistService.js");
    const { fallbackCoverUrl } = await import("@/services/assets.js");
    const { getAnimeWatchData } = await import("@/services/watchHistory.js");
    const [nextEpisodes] = await Promise.all([
      fetchEpisodes(client, title.id),
      (async () => {
        try {
          const meta = title.anilistId ? await fetchAniListMetadata(title.anilistId) : await fetchAniListMetadataByTitle(title.title);
          if (meta) s.setMetadata(meta);
          const coverUrl2 = meta?.coverUrl ?? fallbackCoverUrl(title.thumbnail, 250);
          if (coverUrl2) s.setCoverImage(coverUrl2);
        } catch (err) {
          s.setStatus(`Cover unavailable (${err instanceof Error ? err.message : String(err)}), continuing without cover.`);
        }
      })()
    ]);
    s.setEpisodes(nextEpisodes); s.setTotalEpisodes(nextEpisodes.length); s.setSelectedEpisodeIndex(0);
    s.setEpisodeSearch(""); s.setEpisodeSearchActive(false); s.setStreams([]);
    const watched = await getAnimeWatchData(title.id);
    s.setWatchedData(watched ?? null);
    if (watched) { const idx = nextEpisodes.findIndex(ep => ep.id === watched.lastEpisodeId); if (idx !== -1) s.setSelectedEpisodeIndex(idx); }
    s.setScreen("episodes");
  } catch (e) {
    s.setError(e instanceof Error ? e.message : "Unknown episode loading error");
  } finally {
    s.setLoading(false); s.setLoadingLabel(null);
  }
}

export async function fetchAndShowStreams(s: S, episodeOverride?: EpisodeItem): Promise<void> {
  const ep = episodeOverride ?? s.selectedEpisode;
  if (!s.selectedTitle || !ep) return;
  s.setLoading(true); s.setLoadingLabel("Fetching available streams..."); s.setError(null); s.setStreams([]);
  try {
    const { fetchStreamOptions } = await import("@/services/animeService.js");
    const nextStreams = await fetchStreamOptions(client, s.selectedTitle.id, ep.id, s.selectedTitle.title);
    if (nextStreams.length === 0) throw new Error("No stream URLs found for this episode.");
    s.setStreams(nextStreams); s.setSelectedStreamIndex(0); s.setScreen("stream-picker");
  } catch (err) {
    s.setError(err instanceof Error ? err.message : "Unknown error");
  } finally {
    s.setLoading(false); s.setLoadingLabel(null);
  }
}

export async function playSelectedStream(s: S): Promise<void> {
  const stream = s.streams[s.selectedStreamIndex];
  if (!stream || !s.selectedTitle || !s.selectedEpisode) return;
  const currentEpisode = s.selectedEpisode;
  const currentTitle = s.selectedTitle;
  const { launchPlayer } = await import("../player/launchPlayer.js");
  const { extractStreamUrl } = await import("../player/ytdlp.js");
  const { isDirectVideoUrl, getProviderReferer } = await import("@/services/animeService.js");
  const { markEpisodeWatched, getAnimeWatchData } = await import("@/services/watchHistory.js");
  s.setLoading(true); s.setLoadingLabel(`Preparing ${stream.sourceName} stream...`); s.setError(null); s.setScreen("playing");
  try {
    let playUrl = stream.url;
    let referer = stream.referer ?? getProviderReferer(stream.sourceName ?? "");
    if (!isDirectVideoUrl(playUrl)) {
      s.setLoadingLabel("Resolving embed URL via yt-dlp...");
      const resolved = await extractStreamUrl(playUrl, { referer: referer ?? undefined });
      if (resolved) playUrl = resolved.url;
    }

    let playerError: Error | null = null;
    try {
      await launchPlayer(playUrl, { executable: "iina", referer, title: `${currentTitle.title} - ${currentEpisode.label}` });
    } catch (err) {
      playerError = err instanceof Error ? err : new Error(String(err));
    }

    await markEpisodeWatched(currentTitle.id, currentTitle.title, currentEpisode.id, currentEpisode.label, s.totalEpisodes, currentTitle.anilistId);

    const updatedWatched = await getAnimeWatchData(currentTitle.id);
    if (updatedWatched) s.setWatchedData(updatedWatched);

    const realIndex = s.episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (realIndex !== -1) s.setPlayingRealIndex(realIndex);

    if (playerError) {
      s.setError(playerError.message);
      s.setScreen("stream-picker");
    } else {
      s.setSelectedPostPlayIndex(0);
      s.setScreen("post-play");
    }
  } catch (err) {
    s.setError(err instanceof Error ? err.message : "Unknown player error"); s.setScreen("stream-picker");
  } finally {
    s.setLoading(false); s.setLoadingLabel(null);
  }
}

export async function autoPlayNextEpisode(s: S, newRealIndex: number): Promise<void> {
  if (!s.selectedTitle) return;
  const ep = s.episodes[newRealIndex];
  if (!ep) return;
  s.setEpisodeSearch(""); s.setEpisodeSearchActive(false); s.setSelectedEpisodeIndex(newRealIndex); s.setPlayingRealIndex(newRealIndex);
  await fetchAndShowStreams(s, ep);
}

export async function showContinueWatching(s: S): Promise<void> {
  const { getContinueWatching } = await import("@/services/watchHistory.js");
  const list = await getContinueWatching();
  s.setContinueList(list); s.setSelectedContinueIndex(0); s.setScreen("continue-watching");
}

export async function loadEpisodesFromContinue(s: S, data: AnimeWatchData): Promise<void> {
  s.setItems([{ id: data.animeId, title: data.title }]); s.setSelectedSearchIndex(0); s.setEpisodes([]); s.setStreams([]);
  s.setLoading(true); s.setLoadingLabel("Loading episodes..."); s.setError(null); s.setCoverImage(null);
  try {
    const { fetchEpisodes } = await import("@/services/animeService.js");
    const { fetchAniListMetadata, fetchAniListMetadataByTitle } = await import("@/services/anilistService.js");
    const { fallbackCoverUrl } = await import("@/services/assets.js");
    const [nextEpisodes] = await Promise.all([
      fetchEpisodes(client, data.animeId),
      (async () => {
        try {
          const meta = data.anilistId ? await fetchAniListMetadata(data.anilistId) : await fetchAniListMetadataByTitle(data.title);
          if (meta) s.setMetadata(meta);
          const coverUrl = meta?.coverUrl ?? fallbackCoverUrl(undefined, 250);
          if (coverUrl) s.setCoverImage(coverUrl);
        } catch { /* cover optional */ }
      })()
    ]);
    s.setTotalEpisodes(nextEpisodes.length); s.setEpisodes(nextEpisodes);
    const idx = nextEpisodes.findIndex(ep => ep.id === data.lastEpisodeId);
    s.setSelectedEpisodeIndex(idx !== -1 ? idx : 0); s.setEpisodeSearch(""); s.setEpisodeSearchActive(false);
    s.setStreams([]); s.setWatchedData(data); s.setScreen("episodes");
  } catch (e) {
    s.setError(e instanceof Error ? e.message : "Unknown error");
  } finally {
    s.setLoading(false); s.setLoadingLabel(null);
  }
}
