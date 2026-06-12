import React from "react";
import { Box, Text } from "ink";
import type { SearchItem } from "@/api/types.js";
import { PAGE_SIZE } from "@/tui/constants.js";

interface Props {
  query: string;
  items: SearchItem[];
  selectedSearchIndex: number;
  pagedResults: { start: number; items: SearchItem[] };
  error: string | null;
}

export function ResultsScreen({ query, items, selectedSearchIndex, pagedResults, error }: Props): React.ReactElement {
  return (
    <Box flexDirection="column" padding={1} height={"100%"}>
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
