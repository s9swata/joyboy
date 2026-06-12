import React from "react";
import { Box, Text } from "ink";
// @ts-ignore
import TextInput from "ink-text-input";
import Image from "ink-picture";
import type { EpisodeItem, SearchItem } from "@/api/types.js";
import type { AnimeWatchData } from "@/services/watchHistory.js";
import { PAGE_SIZE } from "@/tui/constants.js";
import { formatTimeAgo } from "@/tui/utils.js";

interface Props {
  selectedTitle: SearchItem | undefined;
  episodes: EpisodeItem[];
  displayedEpisodes: EpisodeItem[];
  selectedEpisodeIndex: number;
  episodeSearch: string;
  setEpisodeSearch: (s: string) => void;
  episodeSearchActive: boolean;
  setEpisodeSearchActive: (b: boolean) => void;
  pagedEpisodes: { start: number; items: EpisodeItem[] };
  coverImage: string | null;
  watchedData: AnimeWatchData | null;
  totalEpisodes: number;
  metadata: any;
  error: string | null;
}

export function EpisodesScreen(props: Props): React.ReactElement {
  const { selectedTitle, episodes, displayedEpisodes, selectedEpisodeIndex, episodeSearch, setEpisodeSearch, episodeSearchActive, setEpisodeSearchActive, pagedEpisodes, coverImage, watchedData, totalEpisodes, metadata, error } = props;

  return (
    <Box flexDirection="column" padding={1} height={"100%"}>
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
                    <Box marginTop={1}><Text dimColor italic>{metadata.genres.join(", ")}</Text></Box>
                  )}
                  {metadata.synopsis && (
                    <Box marginTop={1}><Text dimColor>{metadata.synopsis.length > 300 ? `${metadata.synopsis.slice(0, 300)}...` : metadata.synopsis}</Text></Box>
                  )}
                </>
              )}
            </Box>
          )}
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          <Box borderStyle="single" borderBottom={false} borderTop={false} borderRight={false} borderLeftColor={episodeSearchActive ? "blueBright" : "gray"} paddingLeft={1} marginBottom={1}>
            <TextInput
              value={episodeSearch}
              onChange={(val: string) => { setEpisodeSearch(val); }}
              onSubmit={() => setEpisodeSearchActive(false)}
              placeholder="/ filter episodes..."
              focus={episodeSearchActive}
            />
          </Box>

          {displayedEpisodes.length === 0 ? <Text dimColor>{episodes.length === 0 ? "No episodes found." : "No matches."}</Text> : null}
          {pagedEpisodes.items.map((episode: EpisodeItem, localIndex: number) => {
            const index = pagedEpisodes.start + localIndex;
            const selected = index === selectedEpisodeIndex;
            const watchedIds = new Set(watchedData?.watchedEpisodes.map(w => w.episodeId) ?? []);
            const isWatched = watchedIds.has(episode.id);
            return (
              <Box key={`${episode.id}-${index}`} paddingLeft={1}>
                <Text color={selected ? "blueBright" : undefined} bold={selected} dimColor={!selected && isWatched}>
                  {selected ? "▶ " : isWatched ? "✓ " : "  "}
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
