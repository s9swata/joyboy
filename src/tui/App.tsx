import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
// @ts-ignore
import TextInput from "ink-text-input";
import Image from "ink-picture";
import { AllanimeClient } from "../api/allanimeClient.js";
import type { EpisodeItem, SearchItem, StreamOption } from "../api/types.js";
import { launchPlayer } from "../player/launchPlayer.js";
import { extractStreamUrl } from "../player/ytdlp.js";
import { fetchEpisodes, fetchStreamOptions, isDirectVideoUrl, getProviderReferer } from "../services/animeService.js";
import { fetchAniListMetadata, fetchAniListMetadataByTitle, AnimeMetadata } from "../services/anilistService.js";
import { searchTitles } from "../services/searchService.js";
import { fallbackCoverUrl } from "../services/assets.js";
import { getAnimeWatchData, markEpisodeWatched, getContinueWatching, AnimeWatchData } from "../services/watchHistory.js";

type Screen = "search" | "continue-watching" | "results" | "episodes" | "stream-picker" | "playing" | "post-play";
const PAGE_SIZE = 12;

const client = new AllanimeClient();

const LOGO = `
   _             _                  
  (_) ___  _   _| |__   ___  _   _  
  | |/ _ \\| | | | '_ \\ / _ \\| | | | 
  | | (_) | |_| | |_) | (_) | |_| | 
 _/ |\\___/ \\__, |_.__/ \\___/ \\__, | 
|__/       |___/             |___/  
`;

export function App(): React.ReactElement {
  const { stdout } = useStdout();
  const height = stdout?.rows ?? 24;

  const [screen, setScreen] = useState<Screen>("search");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [streams, setStreams] = useState<StreamOption[]>([]);

  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0);
  const [selectedStreamIndex, setSelectedStreamIndex] = useState(0);
  const [selectedPostPlayIndex, setSelectedPostPlayIndex] = useState(0);
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [episodeSearchActive, setEpisodeSearchActive] = useState(false);
  const [playingRealIndex, setPlayingRealIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AnimeMetadata | null>(null);
  const [continueList, setContinueList] = useState<AnimeWatchData[]>([]);
  const [selectedContinueIndex, setSelectedContinueIndex] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [watchedData, setWatchedData] = useState<AnimeWatchData | null>(null);

  const selectedTitle = useMemo(() => items[selectedSearchIndex], [items, selectedSearchIndex]);

  const filteredEpisodes = useMemo(() => {
    const q = episodeSearch.trim();
    if (!q) return episodes;
    return episodes.filter(ep => ep.label.toLowerCase().includes(q.toLowerCase()));
  }, [episodes, episodeSearch]);

  const displayedEpisodes = filteredEpisodes;
  const selectedEpisode = useMemo(() => displayedEpisodes[selectedEpisodeIndex], [displayedEpisodes, selectedEpisodeIndex]);

  const pagedResults = useMemo(() => getPageSlice(items, selectedSearchIndex, PAGE_SIZE), [items, selectedSearchIndex]);
  const pagedEpisodes = useMemo(
    () => getPageSlice(displayedEpisodes, selectedEpisodeIndex, PAGE_SIZE),
    [displayedEpisodes, selectedEpisodeIndex],
  );

  const postPlayOptions = useMemo(() => {
    const opts = [];
    if (playingRealIndex < episodes.length - 1) {
      opts.push("Next Episode");
    }
    if (playingRealIndex > 0) {
      opts.push("Previous Episode");
    }
    opts.push("Back to Episodes");
    return opts;
  }, [playingRealIndex, episodes.length]);

  useInput((input: string, key: any) => {
    if (loading) {
      return;
    }

    if (screen === "search") {
      if (key.escape) {
        process.exit(0);
      }
      if (key.return && !query.trim()) {
        void showContinueWatching();
        return;
      }
      return;
    }

    if (screen === "continue-watching") {
      if (key.upArrow) {
        setSelectedContinueIndex((prev: number) => Math.max(prev - 1, 0));
        return;
      }
      if (key.downArrow) {
        setSelectedContinueIndex((prev: number) => Math.min(prev + 1, Math.max(continueList.length - 1, 0)));
        return;
      }
      if (key.return && continueList[selectedContinueIndex]) {
        void loadEpisodesFromContinue(continueList[selectedContinueIndex]);
        return;
      }
      if (key.escape) {
        setScreen("search");
      }
      return;
    }

    if (screen === "results") {
      if (key.upArrow) {
        setSelectedSearchIndex((previous: number) => Math.max(previous - 1, 0));
        return;
      }
      if (key.downArrow) {
        setSelectedSearchIndex((previous: number) => Math.min(previous + 1, Math.max(items.length - 1, 0)));
        return;
      }
      if (key.return && selectedTitle) {
        void loadEpisodes();
        return;
      }
      if (key.escape) {
        setScreen("search");
      }
      return;
    }

    if (screen === "episodes") {
      if (episodeSearchActive) {
        if (key.escape) {
          setEpisodeSearchActive(false);
          setEpisodeSearch("");
          setSelectedEpisodeIndex(0);
        }
        return;
      }
      if (input === "/" || input === "f") {
        setEpisodeSearchActive(true);
        return;
      }
      if (key.upArrow) {
        setSelectedEpisodeIndex((previous: number) => Math.max(previous - 1, 0));
        return;
      }
      if (key.downArrow) {
        setSelectedEpisodeIndex((previous: number) => Math.min(previous + 1, Math.max(displayedEpisodes.length - 1, 0)));
        return;
      }
      if (key.return && selectedEpisode) {
        void fetchAndShowStreams();
        return;
      }
      if (key.escape) {
        setScreen("results");
      }
      return;
    }

    if (screen === "stream-picker") {
      if (key.upArrow) {
        setSelectedStreamIndex((previous: number) => Math.max(previous - 1, 0));
        return;
      }
      if (key.downArrow) {
        setSelectedStreamIndex((previous: number) => Math.min(previous + 1, Math.max(streams.length - 1, 0)));
        return;
      }
      if (key.return) {
        void playSelectedStream();
        return;
      }
      if (key.escape) {
        setSelectedEpisodeIndex(playingRealIndex);
        setScreen("episodes");
      }
      return;
    }

    if (screen === "post-play") {
      if (key.upArrow) {
        setSelectedPostPlayIndex((previous: number) => Math.max(previous - 1, 0));
        return;
      }
      if (key.downArrow) {
        setSelectedPostPlayIndex((previous: number) => Math.min(previous + 1, Math.max(postPlayOptions.length - 1, 0)));
        return;
      }
      if (key.return) {
        const action = postPlayOptions[selectedPostPlayIndex];
        if (action === "Next Episode") {
          const nextRealIndex = playingRealIndex + 1;
          void autoPlayNextEpisode(nextRealIndex);
        } else if (action === "Previous Episode") {
          const prevRealIndex = playingRealIndex - 1;
          void autoPlayNextEpisode(prevRealIndex);
        } else {
          setSelectedEpisodeIndex(playingRealIndex);
          setScreen("episodes");
        }
        return;
      }
      if (key.escape) {
        setSelectedEpisodeIndex(playingRealIndex);
        setScreen("episodes");
      }
      return;
    }
  });

  useEffect(() => {
    if (screen === "results" && selectedSearchIndex >= items.length && items.length > 0) {
      setSelectedSearchIndex(0);
    }
  }, [screen, selectedSearchIndex, items.length]);

  useEffect(() => {
    if (screen === "episodes" && selectedEpisodeIndex >= displayedEpisodes.length && displayedEpisodes.length > 0) {
      setSelectedEpisodeIndex(0);
    }
  }, [screen, selectedEpisodeIndex, displayedEpisodes.length]);

  useEffect(() => {
    if (screen === "stream-picker" && selectedStreamIndex >= streams.length && streams.length > 0) {
      setSelectedStreamIndex(0);
    }
  }, [screen, selectedStreamIndex, streams.length]);

  useEffect(() => {
    if (screen === "post-play" && selectedPostPlayIndex >= postPlayOptions.length && postPlayOptions.length > 0) {
      setSelectedPostPlayIndex(0);
    }
  }, [screen, selectedPostPlayIndex, postPlayOptions.length]);

  async function runSearch(searchValue: string): Promise<void> {
    if (!searchValue.trim()) return;
    setLoading(true);
    setLoadingLabel("Searching titles...");
    setError(null);
    setStatus(null);

    try {
      const found = await searchTitles(client, { query: searchValue });
      setItems(found);
      setSelectedSearchIndex(0);
      setEpisodes([]);
      setStreams([]);
      setScreen("results");
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : "Unknown search error";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingLabel(null);
    }
  }

  async function loadEpisodes(): Promise<void> {
    if (!selectedTitle) return;

    setLoading(true);
    setLoadingLabel("Loading episodes and cover...");
    setError(null);
    setStatus(null);
    setCoverImage(null);

    try {
      const [nextEpisodes] = await Promise.all([
        fetchEpisodes(client, selectedTitle.id),
        (async () => {
          try {
            const meta = selectedTitle.anilistId
              ? await fetchAniListMetadata(selectedTitle.anilistId)
              : await fetchAniListMetadataByTitle(selectedTitle.title);

            if (meta) {
              setMetadata(meta);
            }

            const coverUrl = meta?.coverUrl ?? fallbackCoverUrl(selectedTitle.thumbnail, 250);
            if (coverUrl) {
              setCoverImage(coverUrl);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setStatus(`Cover unavailable (${msg}), continuing without cover.`);
          }
        })()
      ]);

      setEpisodes(nextEpisodes);
      setTotalEpisodes(nextEpisodes.length);
      setSelectedEpisodeIndex(0);
      setEpisodeSearch("");
      setEpisodeSearchActive(false);
      setStreams([]);

      const watched = await getAnimeWatchData(selectedTitle.id);
      setWatchedData(watched ?? null);
      if (watched) {
        const idx = nextEpisodes.findIndex(ep => ep.id === watched.lastEpisodeId);
        if (idx !== -1) {
          setSelectedEpisodeIndex(idx);
        }
      }

      setScreen("episodes");
    } catch (episodeError) {
      const message = episodeError instanceof Error ? episodeError.message : "Unknown episode loading error";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingLabel(null);
    }
  }

  async function fetchAndShowStreams(): Promise<void> {
    if (!selectedTitle || !selectedEpisode) return;
    setLoading(true);
    setLoadingLabel("Fetching available streams...");
    setError(null);
    setStreams([]);

    try {
      const nextStreams = await fetchStreamOptions(client, selectedTitle.id, selectedEpisode.id, selectedTitle.title);
      if (nextStreams.length === 0) {
        throw new Error("No stream URLs found for this episode.");
      }

      setStreams(nextStreams);
      setSelectedStreamIndex(0);
      setScreen("stream-picker");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingLabel(null);
    }
  }

  async function playSelectedStream(): Promise<void> {
    const stream = streams[selectedStreamIndex];
    if (!stream || !selectedTitle || !selectedEpisode) return;

    setLoading(true);
    setLoadingLabel(`Preparing ${stream.sourceName} stream...`);
    setError(null);
    setScreen("playing");

    try {
      let playUrl = stream.url;
      let referer = stream.referer ?? getProviderReferer(stream.sourceName ?? "");

      if (!isDirectVideoUrl(playUrl)) {
        setLoadingLabel(`Resolving embed URL via yt-dlp...`);
        const resolved = await extractStreamUrl(playUrl, { referer: referer ?? undefined });
        if (resolved) {
          playUrl = resolved.url;
        }
      }

      const playerTitle = `${selectedTitle.title} - ${selectedEpisode.label}`;
      await launchPlayer(playUrl, { executable: "iina", referer, title: playerTitle });

      await markEpisodeWatched(selectedTitle.id, selectedTitle.title, selectedEpisode.id, selectedEpisode.label, totalEpisodes, selectedTitle.anilistId);

      setSelectedPostPlayIndex(0);
      setScreen("post-play");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown player error";
      setError(message);
      setScreen("stream-picker");
    } finally {
      setLoading(false);
      setLoadingLabel(null);
    }
  }

  async function autoPlayNextEpisode(newRealIndex: number): Promise<void> {
    if (!selectedTitle) return;
    const ep = episodes[newRealIndex];
    if (!ep) return;
    setEpisodeSearch("");
    setEpisodeSearchActive(false);
    setSelectedEpisodeIndex(newRealIndex);
    setPlayingRealIndex(newRealIndex);
    await fetchAndShowStreams();
  }

  async function showContinueWatching(): Promise<void> {
    const list = await getContinueWatching();
    setContinueList(list);
    setSelectedContinueIndex(0);
    setScreen("continue-watching");
  }

  async function loadEpisodesFromContinue(data: AnimeWatchData): Promise<void> {
    setSelectedSearchIndex(0);
    const item: SearchItem = { id: data.animeId, title: data.title };
    setItems([item]);
    setSelectedSearchIndex(0);
    setEpisodes([]);
    setStreams([]);

    setLoading(true);
    setLoadingLabel("Loading episodes...");
    setError(null);
    setCoverImage(null);

    try {
      const [nextEpisodes] = await Promise.all([
        fetchEpisodes(client, data.animeId),
        (async () => {
          try {
            const meta = data.anilistId
              ? await fetchAniListMetadata(data.anilistId)
              : await fetchAniListMetadataByTitle(data.title);

            if (meta) {
              setMetadata(meta);
            }

            const coverUrl = meta?.coverUrl ?? fallbackCoverUrl(undefined, 250);
            if (coverUrl) {
              setCoverImage(coverUrl);
            }
          } catch {
            // cover is optional
          }
        })()
      ]);

      setTotalEpisodes(nextEpisodes.length);
      setEpisodes(nextEpisodes);

      const idx = nextEpisodes.findIndex(ep => ep.id === data.lastEpisodeId);
      setSelectedEpisodeIndex(idx !== -1 ? idx : 0);
      setEpisodeSearch("");
      setEpisodeSearchActive(false);
      setStreams([]);
      setWatchedData(data);
      setScreen("episodes");
    } catch (episodeError) {
      const message = episodeError instanceof Error ? episodeError.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
      setLoadingLabel(null);
    }
  }

  if (screen === "search") {
    return (
      <Box flexDirection="column" height={height - 2} width="100%">
        <Box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center">
          <Text color="cyanBright" dimColor>{LOGO}</Text>

          <Box width={70} flexDirection="column" marginTop={2}>
            <Box borderStyle="single" borderBottom={false} borderTop={false} borderRight={false} borderLeftColor="blue" paddingLeft={1}>
              <TextInput
                value={query}
                onChange={setQuery}
                onSubmit={runSearch}
                placeholder="Search anime... &quot;Demon Slayer&quot;"
              />
            </Box>
            <Box marginTop={1} flexDirection="row">
              <Text color="blueBright">Search  </Text>
              <Text dimColor>allanime · </Text>
              <Text dimColor>⏎ empty for continue watching</Text>
            </Box>
          </Box>

          <Box marginTop={4}>
            <Text dimColor>
              ⏎ <Text color="gray">search</Text>   esc <Text color="gray">exit</Text>
            </Text>
          </Box>
        </Box>

        <Box width="100%" flexDirection="row" justifyContent="space-between">
          <Text dimColor>~/cwo/joyboy  <Text color="greenBright">◉</Text> ALLANIME /status</Text>
          <Text dimColor>1.0.0</Text>
        </Box>

        {loading && loadingLabel ? (
          <Box marginTop={1}><Text color="blue">{loadingLabel}</Text></Box>
        ) : null}
        {error ? <Box marginTop={1}><Text color="red">{`Error: ${error}`}</Text></Box> : null}
      </Box>
    );
  }

  if (screen === "continue-watching") {
    const list = continueList.slice(0, height - 8);
    return (
      <Box flexDirection="column" padding={1} height={height - 1}>
        <Text color="cyanBright" bold>Continue Watching</Text>
        <Box marginTop={1} flexDirection="column" flexGrow={1}>
          {list.length === 0 ? <Text dimColor>No watch history yet. Search for an anime to start!</Text> : null}
          {list.map((entry: AnimeWatchData, index: number) => {
            const selected = index === selectedContinueIndex;
            const progress = `${entry.watchedEpisodes.length}/${entry.totalEpisodes || "?"}`;
            const ago = formatTimeAgo(entry.lastWatchedAt);
            return (
              <Box key={entry.animeId} paddingLeft={1}>
                <Text color={selected ? "blueBright" : undefined} bold={selected}>
                  {selected ? "▶ " : "  "}
                  {entry.title.length > 45 ? `${entry.title.slice(0, 45)}...` : entry.title}
                  <Text dimColor> — {progress} eps, {ago}</Text>
                </Text>
              </Box>
            );
          })}
        </Box>
        {error ? <Box><Text color="red">{`Error: ${error}`}</Text></Box> : null}
        <Box marginTop={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} borderTopColor="gray">
          <Text dimColor>
            ↑/↓ <Text color="white">navigate</Text>   ↵ <Text color="white">resume</Text>   esc <Text color="white">back</Text>
          </Text>
        </Box>
      </Box>
    );
  }

  if (screen === "results") {
    return (
      <Box flexDirection="column" padding={1} height={height - 1}>
        <Text color="cyanBright" bold>Search Results for "{query}"</Text>
        <Box marginTop={1} flexDirection="column" flexGrow={1}>
          {items.length === 0 ? <Text dimColor>No results found.</Text> : null}
          {pagedResults.items.map((item: SearchItem, localIndex: number) => {
            const index = pagedResults.start + localIndex;
            const selected = index === selectedSearchIndex;
            return (
              <Box key={`${item.id}-${index}`} paddingLeft={1}>
                <Text color={selected ? "blueBright" : undefined} bold={selected}>
                  {selected ? "▶ " : "  "}
                  {item.title}
                </Text>
              </Box>
            );
          })}
        </Box>

        {items.length > PAGE_SIZE ? (
          <Box marginBottom={1}>
            <Text dimColor>{`Showing ${pagedResults.start + 1}-${Math.min(pagedResults.start + PAGE_SIZE, items.length)} of ${items.length}`}</Text>
          </Box>
        ) : null}

        {error ? <Box><Text color="red">{`Error: ${error}`}</Text></Box> : null}

        <Box marginTop={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} borderTopColor="gray">
          <Text dimColor>↑/↓ <Text color="white">navigate</Text>   ↵ <Text color="white">episodes</Text>   esc <Text color="white">back</Text></Text>
        </Box>
      </Box>
    );
  }

  if (screen === "episodes") {
    return (
      <Box flexDirection="column" padding={1} height={height - 1}>
        <Text color="cyanBright" bold>{selectedTitle?.title ?? "Unknown title"}</Text>

        <Box marginTop={1} flexDirection="row" flexGrow={1}>
          <Box width="50%" flexDirection="column" marginRight={2}>
            {coverImage ? (
              <Image src={coverImage} width={25} height={20} protocol="kitty" alt="Cover" />
            ) : (
              <Box borderStyle="single" borderColor="gray" padding={2} width={30} height={15} justifyContent="center" alignItems="center">
                <Text dimColor>No Image</Text>
              </Box>
            )}

            {(watchedData || metadata) && (
              <Box flexDirection="column" marginTop={1}>
                {watchedData && (
                  <Box flexDirection="column">
                    <Box flexDirection="row">
                      <Text dimColor>Resume: </Text>
                      <Text color="greenBright">{watchedData.lastEpisodeLabel}</Text>
                    </Box>
                    <Box flexDirection="row">
                      <Text dimColor>Progress: </Text>
                      <Text color="blueBright">{watchedData.watchedEpisodes.length}/{totalEpisodes || watchedData.totalEpisodes} eps</Text>
                    </Box>
                    <Box flexDirection="row">
                      <Text dimColor>Last: </Text>
                      <Text dimColor>{formatTimeAgo(watchedData.lastWatchedAt)}</Text>
                    </Box>
                  </Box>
                )}
                {metadata && (
                  <>
                    <Box flexDirection="row" justifyContent="space-between">
                      {metadata.score && <Text color="yellowBright">★ {metadata.score}</Text>}
                      {metadata.episodes && <Text color="blueBright">{metadata.episodes} EPS</Text>}
                      {metadata.status && <Text color={metadata.status.includes("Finished") ? "green" : "magenta"}>{metadata.status}</Text>}
                    </Box>
                    {metadata.genres && metadata.genres.length > 0 && (
                      <Box marginTop={1}>
                        <Text dimColor italic>{metadata.genres.join(", ")}</Text>
                      </Box>
                    )}
                    {metadata.synopsis && (
                      <Box marginTop={1}>
                        <Text dimColor>{metadata.synopsis.length > 300 ? metadata.synopsis.slice(0, 300) + "..." : metadata.synopsis}</Text>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>

          <Box flexDirection="column" flexGrow={1}>
            <Box
              borderStyle="single"
              borderBottom={false}
              borderTop={false}
              borderRight={false}
              borderLeftColor={episodeSearchActive ? "blueBright" : "gray"}
              paddingLeft={1}
              marginBottom={1}
            >
              <TextInput
                value={episodeSearch}
                onChange={(val: string) => {
                  setEpisodeSearch(val);
                  setSelectedEpisodeIndex(0);
                }}
                onSubmit={() => setEpisodeSearchActive(false)}
                placeholder="/ filter episodes..."
                focus={episodeSearchActive}
              />
            </Box>

            {displayedEpisodes.length === 0 ? (
              <Text dimColor>{episodes.length === 0 ? "No episodes found." : "No matches."}</Text>
            ) : null}
            {pagedEpisodes.items.map((episode: EpisodeItem, localIndex: number) => {
              const index = pagedEpisodes.start + localIndex;
              const selected = index === selectedEpisodeIndex;
              return (
                <Box key={`${episode.id}-${index}`} paddingLeft={1}>
                  <Text color={selected ? "blueBright" : undefined} bold={selected}>
                    {selected ? "▶ " : "  "}
                    {episode.label}
                  </Text>
                </Box>
              );
            })}
            {displayedEpisodes.length > PAGE_SIZE ? (
              <Box marginTop={1}>
                <Text dimColor>{`Showing ${pagedEpisodes.start + 1}-${Math.min(pagedEpisodes.start + PAGE_SIZE, displayedEpisodes.length)} of ${displayedEpisodes.length}`}</Text>
              </Box>
            ) : null}
          </Box>
        </Box>

        {error ? <Box><Text color="red">{`Error: ${error}`}</Text></Box> : null}

        <Box marginTop={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} borderTopColor="gray">
          <Text dimColor>
            ↑/↓ <Text color="white">navigate</Text>   ↵ <Text color="white">play</Text>   / <Text color="white">filter</Text>   esc <Text color="white">{episodeSearchActive ? "clear filter" : "back"}</Text>
          </Text>
        </Box>
      </Box>
    );
  }

  if (screen === "stream-picker") {
    const streamList = streams.slice(0, height - 8);
    return (
      <Box flexDirection="column" padding={1} height={height - 1}>
        <Text color="cyanBright" bold>{selectedTitle?.title}</Text>
        <Text dimColor>{selectedEpisode?.label}</Text>
        <Box marginTop={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} borderTopColor="gray">
          <Text dimColor>  Provider         Quality   URL</Text>
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          {streamList.map((stream: StreamOption, index: number) => {
            const selected = index === selectedStreamIndex;
            const urlDisplay = stream.url.length > 55
              ? `${stream.url.slice(0, 52)}...`
              : stream.url;
            return (
              <Box key={`${stream.sourceName}-${stream.qualityLabel}-${index}`} paddingLeft={1}>
                <Text color={selected ? "blueBright" : undefined} bold={selected}>
                  {selected ? "▶ " : "  "}
                  <Text color="greenBright">{(stream.sourceName ?? "").padEnd(16)}</Text>
                  {stream.qualityLabel.padEnd(9)}
                  <Text dimColor>{urlDisplay}</Text>
                </Text>
              </Box>
            );
          })}
        </Box>

        {error ? <Box><Text color="red">{`Error: ${error}`}</Text></Box> : null}

        <Box marginTop={1} borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} borderTopColor="gray">
          <Text dimColor>
            ↑/↓ <Text color="white">navigate</Text>   ↵ <Text color="white">play</Text>   esc <Text color="white">back</Text>
          </Text>
        </Box>
      </Box>
    );
  }

  if (screen === "playing") {
    return (
      <Box flexDirection="column" padding={2} alignItems="center" justifyContent="center" height={height - 2}>
        <Text color="cyanBright" bold>{selectedTitle?.title}</Text>
        <Text>{selectedEpisode?.label}</Text>
        <Box marginTop={2}>
          <Text color="yellowBright">⏳ {loadingLabel ?? "Loading..."}</Text>
        </Box>
      </Box>
    );
  }

  if (screen === "post-play") {
    return (
      <Box flexDirection="column" padding={2} alignItems="center" justifyContent="center" height={height - 2}>
        <Text color="cyanBright" bold>Playback Finished</Text>
        <Box marginTop={1} marginBottom={2}>
          <Text dimColor>What would you like to do next?</Text>
        </Box>

        <Box flexDirection="column" alignItems="flex-start">
          {postPlayOptions.map((opt: string, idx: number) => {
            const selected = idx === selectedPostPlayIndex;
            return (
              <Box key={opt} paddingY={0}>
                <Text color={selected ? "blueBright" : undefined} bold={selected}>
                  {selected ? "▶ " : "  "} {opt}
                </Text>
              </Box>
            );
          })}
        </Box>

        <Box marginTop={4}>
           <Text dimColor>↑/↓ <Text color="white">navigate</Text>   ↵ <Text color="white">select</Text>   esc <Text color="white">episodes</Text></Text>
        </Box>
      </Box>
    );
  }

  return <Box><Text>Unknown state</Text></Box>;
}

function getPageSlice<T>(items: T[], selectedIndex: number, pageSize: number): { start: number; items: T[] } {
  if (items.length === 0) {
    return { start: 0, items: [] };
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
  const page = Math.floor(safeIndex / pageSize);
  const start = page * pageSize;
  const end = Math.min(start + pageSize, items.length);
  return { start, items: items.slice(start, end) };
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
