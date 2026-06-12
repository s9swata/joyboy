import React from "react";
import { Box, Text } from "ink";
import type { AnimeWatchData } from "@/services/watchHistory.js";
import { formatTimeAgo } from "@/tui/utils.js";

interface Props {
  continueList: AnimeWatchData[];
  selectedContinueIndex: number;
  error: string | null;
  height: number;
}

export function ContinueWatchingScreen({ continueList, selectedContinueIndex, error, height }: Props): React.ReactElement {
  const list = continueList.slice(0, height - 8);
  return (
    <Box flexDirection="column" padding={1} height={height - 1}>
      <Text color="cyanBright" bold>Continue Watching</Text>
      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        {list.length === 0 ? <Text dimColor>No watch history yet. Search for an anime to start!</Text> : null}
        {list.map((entry: AnimeWatchData | undefined, index: number) => {
          if (!entry) return null;
          const selected = index === selectedContinueIndex;
          const watched = entry.watchedEpisodes ?? [];
          const progress = `${watched.length}/${entry.totalEpisodes || "?"}`;
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
