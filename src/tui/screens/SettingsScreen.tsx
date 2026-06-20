import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { PlayerId, PlayerInfo } from "@/player/playerService.js";

interface Props {
  selectedPlayer: PlayerId;
  onSelectPlayer: (player: PlayerId) => void;
  onClose: () => void;
}

export function SettingsScreen({ selectedPlayer, onSelectPlayer, onClose }: Props): React.ReactElement {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    (async () => {
      const { detectPlayers } = await import("@/player/playerService.js");
      const detected = detectPlayers();
      setPlayers(detected);
      const idx = detected.findIndex(p => p.id === selectedPlayer);
      if (idx !== -1) setCursor(idx);
    })();
  }, []);

  const available = players.filter(p => p.available);
  const list = available.length > 0 ? available : players;

  useInput((_input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setCursor(prev => Math.max(prev - 1, 0));
      return;
    }

    if (key.downArrow) {
      setCursor(prev => Math.min(prev + 1, list.length - 1));
      return;
    }

    if (key.return) {
      onSelectPlayer(list[cursor].id);
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
      <Text bold underline>Player Settings</Text>
      <Box marginTop={1} flexDirection="column">
        {list.map((p, i) => {
          const isSelected = p.id === selectedPlayer;
          const isCursor = i === cursor;
          const prefix = isCursor ? ">" : " ";
          const marker = isSelected ? "◉" : "○";
          const note = !p.available ? " (not found)" : "";
          return (
            <Box key={p.id}>
              <Text>
                {prefix} <Text color={isSelected ? "green" : "dim"}>{marker}</Text> {p.name}{" "}
                <Text dimColor>{note}</Text>
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · ⏎ select · esc back</Text>
      </Box>
    </Box>
  );
}
