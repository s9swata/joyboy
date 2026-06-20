import { execSync } from "node:child_process";

export type PlayerId = "iina" | "mpv" | "vlc";

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  available: boolean;
}

const PLAYER_DEFS: { id: PlayerId; name: string }[] = [
  { id: "iina", name: "IINA" },
  { id: "mpv", name: "mpv" },
  { id: "vlc", name: "VLC" },
];

export function detectPlayers(): PlayerInfo[] {
  return PLAYER_DEFS.map(p => {
    const cmd = process.platform === "win32" ? "where" : "which";
    try {
      execSync(`${cmd} ${p.id}`, { stdio: "ignore" });
      return { ...p, available: true };
    } catch {
      return { ...p, available: false };
    }
  });
}

export function getDefaultPlayer(available: PlayerInfo[]): PlayerId {
  const order: PlayerId[] = ["iina", "mpv", "vlc"];
  const envPlayer = process.env.ANIME_PLAYER as PlayerId | undefined;
  if (envPlayer && order.includes(envPlayer) && available.find(p => p.id === envPlayer && p.available)) {
    return envPlayer;
  }
  for (const id of order) {
    if (available.find(p => p.id === id && p.available)) return id;
  }
  return "mpv";
}
