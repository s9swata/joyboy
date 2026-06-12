import React from "react";
import { Box, Text } from "ink";
import type { StreamOption, SearchItem, EpisodeItem } from "@/api/types.js";

interface Props {
  selectedTitle: SearchItem | undefined;
  selectedEpisode: EpisodeItem | undefined;
  streams: StreamOption[];
  selectedStreamIndex: number;
  error: string | null;
  height: number;
}

export function StreamPickerScreen({ selectedTitle, selectedEpisode, streams, selectedStreamIndex, error, height }: Props): React.ReactElement {
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
          const urlDisplay = stream.url.length > 55 ? `${stream.url.slice(0, 52)}...` : stream.url;
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
