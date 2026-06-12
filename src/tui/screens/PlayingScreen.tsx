import React from "react";
import { Box, Text } from "ink";
import type { SearchItem, EpisodeItem } from "@/api/types.js";

interface Props {
  selectedTitle: SearchItem | undefined;
  selectedEpisode: EpisodeItem | undefined;
  loadingLabel: string | null;
}

export function PlayingScreen({ selectedTitle, selectedEpisode, loadingLabel }: Props): React.ReactElement {
  return (
    <Box flexDirection="column" padding={2} alignItems="center" justifyContent="center" height={"100%"}>
      <Text color="cyanBright" bold>{selectedTitle?.title}</Text>
      <Text>{selectedEpisode?.label}</Text>
      <Box marginTop={2}>
        <Text color="yellowBright">⏳ {loadingLabel ?? "Loading..."}</Text>
      </Box>
    </Box>
  );
}
