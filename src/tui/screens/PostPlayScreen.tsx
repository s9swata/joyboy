import React from "react";
import { Box, Text } from "ink";

interface Props {
  postPlayOptions: string[];
  selectedPostPlayIndex: number;
}

export function PostPlayScreen({ postPlayOptions, selectedPostPlayIndex }: Props): React.ReactElement {
  return (
    <Box flexDirection="column" padding={2} alignItems="center" justifyContent="center" height={"100%"}>
      <Text color="cyanBright" bold>What would you like to do next?</Text>

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
