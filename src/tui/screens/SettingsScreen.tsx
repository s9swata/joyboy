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
      setCursor(prev => Math.min(prev + 1, players.length - 1));
      return;
    }

    if (key.return) {
      if (players[cursor].available) {
        onSelectPlayer(players[cursor].id);
        onClose();
      }
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
      <Text bold underline>Player Settings</Text>
      <Box marginTop={1} flexDirection="column">
        {players.map((p, i) => {
          const isSelected = p.id === selectedPlayer;
          const isCursor = i === cursor;
          const prefix = isCursor ? ">" : " ";
          const status = p.available ? "✓" : "✗";
          const marker = isSelected ? "◉" : "○";
          return (
            <Box key={p.id}>
              <Text>
                {prefix} <Text color={isCursor ? "yellow" : "dim"}>{status}</Text>{" "}
                <Text color={isSelected ? "green" : undefined}>{marker}</Text>{" "}
                {p.name}{" "}
                <Text dimColor>{!p.available ? "(not installed)" : isSelected ? "(active)" : ""}</Text>
              </Text>
            </Box>
          );
        })}
      </Box>
      {players.filter(p => p.available).length === 0 ? (
        <Box marginTop={1}>
          <Text color="red">No player found. Install mpv or VLC to play videos.</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · ⏎ select · esc back</Text>
      </Box>
    </Box>
  );
}
