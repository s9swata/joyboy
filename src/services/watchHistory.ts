import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface WatchedEpisode {
  episodeId: string;
  episodeLabel: string;
  watchedAt: number;
}

export interface AnimeWatchData {
  animeId: string;
  title: string;
  anilistId?: number;
  totalEpisodes: number;
  lastEpisodeId: string;
  lastEpisodeLabel: string;
  lastWatchedAt: number;
  watchedEpisodes: WatchedEpisode[];
}

export type WatchHistory = Record<string, AnimeWatchData>;

const HISTORY_FILE = "watch-history.json";

function getConfigDir(): string {
  return join(
    process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
    "joyboy",
  );
}

function getHistoryPath(): string {
  return join(getConfigDir(), HISTORY_FILE);
}

async function ensureConfigDir(): Promise<void> {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadWatchHistory(): Promise<WatchHistory> {
  try {
    const filePath = getHistoryPath();
    if (!existsSync(filePath)) {
      return {};
    }
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    // Migrate from old format: { entries: { animeId: { episodeId, ... } } }
    if ("entries" in parsed && parsed.entries && typeof parsed.entries === "object" && !Array.isArray(parsed.entries)) {
      const oldEntries = parsed.entries as Record<string, Record<string, unknown>>;
      const migrated: WatchHistory = {};
      for (const [animeId, oldEntry] of Object.entries(oldEntries)) {
        const epId = String(oldEntry.episodeId ?? "");
        const epLabel = String(oldEntry.episodeLabel ?? `Episode ${epId}`);
        migrated[animeId] = {
          animeId,
          title: String(oldEntry.title ?? "Unknown"),
          anilistId: typeof oldEntry.anilistId === "number" ? oldEntry.anilistId : undefined,
          totalEpisodes: typeof oldEntry.totalEpisodes === "number" ? oldEntry.totalEpisodes : 0,
          lastEpisodeId: epId,
          lastEpisodeLabel: epLabel,
          lastWatchedAt: typeof oldEntry.watchedAt === "number" ? oldEntry.watchedAt : Date.now(),
          watchedEpisodes: [{ episodeId: epId, episodeLabel: epLabel, watchedAt: typeof oldEntry.watchedAt === "number" ? oldEntry.watchedAt : Date.now() }],
        };
      }
      // Overwrite old format with migrated data
      await writeFile(filePath, JSON.stringify(migrated, null, 2), "utf-8");
      return migrated;
    }

    return parsed as WatchHistory;
  } catch {
    return {};
  }
}

export async function saveWatchHistory(history: WatchHistory): Promise<void> {
  await ensureConfigDir();
  await writeFile(getHistoryPath(), JSON.stringify(history, null, 2), "utf-8");
}

export async function markEpisodeWatched(
  animeId: string,
  title: string,
  episodeId: string,
  episodeLabel: string,
  totalEpisodes: number,
  anilistId?: number,
): Promise<void> {
  const history = await loadWatchHistory();
  const existing = history[animeId];

  const now = Date.now();
  const newEpisode: WatchedEpisode = { episodeId, episodeLabel, watchedAt: now };

  if (!existing) {
    history[animeId] = {
      animeId,
      title,
      anilistId,
      totalEpisodes,
      lastEpisodeId: episodeId,
      lastEpisodeLabel: episodeLabel,
      lastWatchedAt: now,
      watchedEpisodes: [newEpisode],
    };
  } else {
    const alreadyWatched = existing.watchedEpisodes.some(e => e.episodeId === episodeId);
    if (!alreadyWatched) {
      existing.watchedEpisodes.push(newEpisode);
    } else {
      const found = existing.watchedEpisodes.find(e => e.episodeId === episodeId);
      if (found) {
        found.watchedAt = now;
      }
    }
    existing.lastEpisodeId = episodeId;
    existing.lastEpisodeLabel = episodeLabel;
    existing.lastWatchedAt = now;
    existing.title = title;
    existing.totalEpisodes = totalEpisodes;
    if (anilistId !== undefined) {
      existing.anilistId = anilistId;
    }
  }

  await saveWatchHistory(history);
}

export async function getAnimeWatchData(animeId: string): Promise<AnimeWatchData | undefined> {
  const history = await loadWatchHistory();
  return history[animeId];
}

export async function getContinueWatching(): Promise<AnimeWatchData[]> {
  const history = await loadWatchHistory();
  return Object.values(history).sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
}

export async function removeAnimeHistory(animeId: string): Promise<void> {
  const history = await loadWatchHistory();
  delete history[animeId];
  await saveWatchHistory(history);
}

export async function clearAllWatchHistory(): Promise<void> {
  await saveWatchHistory({});
}
