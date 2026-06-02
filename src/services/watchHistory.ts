import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export interface WatchHistoryEntry {
  animeId: string;
  title: string;
  episodeId: string;
  episodeLabel: string;
  watchedAt: number;
}

export interface WatchHistory {
  entries: Record<string, WatchHistoryEntry>;
}

const HISTORY_FILE = "watch-history.json";

async function getHistoryPath(): Promise<string> {
  const configDir = join(process.env.XDG_CONFIG_HOME ?? join(process.env.HOME ?? "", ".config"), "joyboy");
  return join(configDir, HISTORY_FILE);
}

async function ensureConfigDir(): Promise<string> {
  const configDir = join(process.env.XDG_CONFIG_HOME ?? join(process.env.HOME ?? "", ".config"), "joyboy");
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }
  return configDir;
}

export async function loadWatchHistory(): Promise<WatchHistory> {
  try {
    const filePath = await getHistoryPath();
    if (!existsSync(filePath)) {
      return { entries: {} };
    }
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (!parsed.entries || typeof parsed.entries !== "object") {
      return { entries: {} };
    }
    return parsed as WatchHistory;
  } catch {
    return { entries: {} };
  }
}

export async function saveWatchHistory(history: WatchHistory): Promise<void> {
  await ensureConfigDir();
  const filePath = await getHistoryPath();
  await writeFile(filePath, JSON.stringify(history, null, 2), "utf-8");
}

export async function setLastWatched(
  animeId: string,
  title: string,
  episodeId: string,
  episodeLabel: string,
): Promise<void> {
  const history = await loadWatchHistory();
  history.entries[animeId] = {
    animeId,
    title,
    episodeId,
    episodeLabel,
    watchedAt: Date.now(),
  };
  await saveWatchHistory(history);
}

export async function getLastWatched(animeId: string): Promise<WatchHistoryEntry | undefined> {
  const history = await loadWatchHistory();
  return history.entries[animeId];
}

export async function getAllWatchHistory(): Promise<WatchHistoryEntry[]> {
  const history = await loadWatchHistory();
  return Object.values(history.entries).sort((a, b) => b.watchedAt - a.watchedAt);
}

export async function removeWatchHistory(animeId: string): Promise<void> {
  const history = await loadWatchHistory();
  delete history.entries[animeId];
  await saveWatchHistory(history);
}

export async function clearAllWatchHistory(): Promise<void> {
  await saveWatchHistory({ entries: {} });
}
