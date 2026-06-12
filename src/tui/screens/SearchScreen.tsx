import React from "react";
import { Box, Text } from "ink";
// @ts-ignore
import TextInput from "ink-text-input";
import { LOGO } from "@/tui/constants.js";

interface Props {
  query: string;
  setQuery: (s: string) => void;
  runSearch: (s: string) => Promise<void>;
  showContinueWatching: () => Promise<void>;
  loading: boolean;
  loadingLabel: string | null;
  error: string | null;
  height: number;
}

export function SearchScreen({ query, setQuery, runSearch, showContinueWatching, loading, loadingLabel, error, height }: Props): React.ReactElement {
  return (
    <Box flexDirection="column" height={height - 2} width="100%">
      <Box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center">
        <Text color="cyanBright" dimColor>{LOGO}</Text>

        <Box width={70} flexDirection="column" marginTop={2}>
          <Box borderStyle="single" borderBottom={false} borderTop={false} borderRight={false} borderLeftColor="blue" paddingLeft={1}>
            <TextInput
              value={query}
              onChange={setQuery}
              onSubmit={(val: string) => val.trim() ? runSearch(val) : showContinueWatching()}
              placeholder='Search anime... "Demon Slayer"'
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

      {loading && loadingLabel ? <Box marginTop={1}><Text color="blue">{loadingLabel}</Text></Box> : null}
      {error ? <Box marginTop={1}><Text color="red">{`Error: ${error}`}</Text></Box> : null}
    </Box>
  );
}
