import { AllanimeClient } from "../api/allanimeClient.js";
import type { EpisodeItem, StreamOption } from "../api/types.js";
import { searchAndGetStreams } from "./hianimeScraper.js";

const URL_REGEX = /^https?:\/\//i;
const PROVIDERS = new Set(["Default", "Yt-mp4", "S-mp4", "Mp4", "Ak", "Ok", "Sw", "Luf-Mp4", "Fm-Hls", "Vg", "Bg", "Rf", "Ss-Hls", "Sl-mp4", "Uv-mp4"]);

export async function fetchEpisodes(client: AllanimeClient, titleId: string): Promise<EpisodeItem[]> {
  const payload = await client.showEpisodes(titleId);
  return extractEpisodes(payload);
}

export async function fetchStreamOptions(
  client: AllanimeClient,
  titleId: string,
  episodeId: string,
  title?: string,
): Promise<StreamOption[]> {
  let streams: StreamOption[] = [];
  try {
    streams = await fetchStreamOptionsFromAllanime(client, titleId, episodeId);
  } catch (err) {
    console.error("Allanime stream fetch error:", err);
    streams = [];
  }

  if (streams.length === 0) {
    try {
      return await fetchStreamOptionsFromHianime(titleId, episodeId, title);
    } catch {
      return [];
    }
  }

  return streams;
}

async function fetchStreamOptionsFromAllanime(
  client: AllanimeClient,
  titleId: string,
  episodeId: string,
): Promise<StreamOption[]> {
  const payload = await client.episodeSources(titleId, "sub", episodeId);
  return extractStreamOptionsFromEpisodeSources(client, payload);
}

async function fetchStreamOptionsFromHianime(
  titleId: string,
  episodeId: string,
  title?: string,
): Promise<StreamOption[]> {
  if (!title) {
    return [];
  }

  const episodeNum = Number.parseInt(episodeId, 10);
  if (Number.isNaN(episodeNum)) {
    return [];
  }

  try {
    return await searchAndGetStreams(title, episodeNum, "sub");
  } catch {
    return [];
  }
}

function extractEpisodes(payload: unknown): EpisodeItem[] {
  const seen = new Map<string, EpisodeItem>();

  const detail = pickShowObject(payload);
  const fromDetailedList = extractEpisodesFromAvailableDetail(detail);
  for (const episode of fromDetailedList) {
    seen.set(episode.id, episode);
  }

  if (seen.size === 0) {
    const generated = extractEpisodesFromCounts(detail);
    for (const episode of generated) {
      seen.set(episode.id, episode);
    }
  }

  walk(payload, value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return;
    }

    const record = value as Record<string, unknown>;
    const chapterString = pickString(record, ["episodeString", "chapterString"]);
    if (chapterString) {
      const id = normalizeEpisodeId(chapterString);
      if (!seen.has(id)) {
        const title = pickString(record, ["title", "name", "episodeTitle"]);
        seen.set(id, {
          id,
          label: title ? `Episode ${id} - ${title}` : `Episode ${id}`,
        });
      }
    }

    const availableEpisodes = record.availableEpisodes;
    if (Array.isArray(availableEpisodes)) {
      for (const entry of availableEpisodes) {
        if (typeof entry === "string" || typeof entry === "number") {
          const id = normalizeEpisodeId(String(entry));
          if (!seen.has(id)) {
            seen.set(id, { id, label: `Episode ${id}` });
          }
        }
      }
    }
  });

  return [...seen.values()].sort(sortEpisodes);
}

function pickShowObject(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const root = payload as Record<string, unknown>;
  if (root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    const show = data.show;
    if (show && typeof show === "object" && !Array.isArray(show)) {
      return show as Record<string, unknown>;
    }
  }

  if (root.show && typeof root.show === "object" && !Array.isArray(root.show)) {
    return root.show as Record<string, unknown>;
  }

  return root;
}

function extractEpisodesFromAvailableDetail(detail: Record<string, unknown> | undefined): EpisodeItem[] {
  if (!detail) {
    return [];
  }

  const source = detail.availableEpisodesDetail;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return [];
  }

  const sub = (source as Record<string, unknown>).sub;
  if (!Array.isArray(sub)) {
    return [];
  }

  const episodes = sub
    .map(value => {
      if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
      }

      const id = normalizeEpisodeId(String(value));
      if (!id) {
        return undefined;
      }

      return { id, label: `Episode ${id}` };
    })
    .filter((value): value is EpisodeItem => Boolean(value));

  return dedupeEpisodes(episodes);
}

function extractEpisodesFromCounts(detail: Record<string, unknown> | undefined): EpisodeItem[] {
  if (!detail) {
    return [];
  }

  const source = detail.availableEpisodes;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return [];
  }

  const count = (source as Record<string, unknown>).sub;
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
    return [];
  }

  const max = Math.floor(count);
  const episodes: EpisodeItem[] = [];
  for (let number = 1; number <= max; number += 1) {
    episodes.push({ id: String(number), label: `Episode ${number}` });
  }

  return episodes;
}

function dedupeEpisodes(episodes: EpisodeItem[]): EpisodeItem[] {
  const deduped = new Map<string, EpisodeItem>();
  for (const episode of episodes) {
    deduped.set(episode.id, episode);
  }

  return [...deduped.values()];
}

async function extractStreamOptionsFromEpisodeSources(client: AllanimeClient, payload: unknown): Promise<StreamOption[]> {
  const providers = extractProviders(payload);
  const seen = new Map<string, StreamOption>();

  for (const provider of providers) {
    const sourceUrl = typeof provider.sourceUrl === "string" ? provider.sourceUrl : undefined;
    const sourceName = typeof provider.sourceName === "string" ? provider.sourceName : undefined;
    if (!sourceUrl || !sourceName || !PROVIDERS.has(sourceName)) {
      continue;
    }

    if (sourceUrl.startsWith("--")) {
      const hex = sourceUrl.slice(2);
      const decryptedPath = decryptProviderPath(hex);

      if (decryptedPath.includes("tools.fast4speed.rsvp")) {
        upsertStream(seen, {
          url: decryptedPath.replace("clock", "clock.json"),
          qualityLabel: inferQualityFromUrl(decryptedPath) ?? sourceName,
          referer: "https://allanime.day",
          sourceName,
        });
        continue;
      }

      if (decryptedPath.includes("mp4upload")) {
        const videoUrl = await fetchMp4uploadVideoUrl(decryptedPath);
        if (videoUrl) {
          upsertStream(seen, {
            url: videoUrl,
            qualityLabel: sourceName,
            referer: "https://allanime.day",
            sourceName,
          });
        }
        continue;
      }

      await handleProviderJsonPayload(client, seen, decryptedPath, sourceName);
    } else if (sourceUrl.startsWith("//")) {
      const fullUrl = `https:${sourceUrl}`;
      if (mightBeVideoStream(fullUrl)) {
        upsertStream(seen, {
          url: fullUrl,
          qualityLabel: inferQualityFromUrl(fullUrl) ?? sourceName,
          referer: "https://allanime.day",
          sourceName,
        });
      }
    } else if (URL_REGEX.test(sourceUrl)) {
      if (sourceUrl.includes("mp4upload")) {
        const videoUrl = await fetchMp4uploadVideoUrl(sourceUrl);
        if (videoUrl) {
          upsertStream(seen, {
            url: videoUrl,
            qualityLabel: sourceName,
            referer: "https://allanime.day",
            sourceName,
          });
        }
        continue;
      }

      if (mightBeVideoStream(sourceUrl)) {
        upsertStream(seen, {
          url: sourceUrl,
          qualityLabel: inferQualityFromUrl(sourceUrl) ?? sourceName,
          referer: "https://allanime.day",
          sourceName,
        });
      }
    }
  }

  return [...seen.values()].sort((left, right) => qualityRank(right.qualityLabel) - qualityRank(left.qualityLabel));
}

async function handleProviderJsonPayload(
  client: AllanimeClient,
  store: Map<string, StreamOption>,
  decryptedPath: string,
  sourceName: string,
): Promise<void> {
  const jsonPath = decryptedPath.replace("/clock?", "/clock.json?");
  let links: Array<{ link?: string; src?: string; headers?: Record<string, string> }> = [];
  try {
    const payloadObject = await client.fetchProviderPayload(jsonPath);
    links = extractLinks(payloadObject);
  } catch {
    return;
  }

  for (const link of links) {
    const linkUrl = link.link || link.src;
    if (!linkUrl) {
      continue;
    }

    const referer = typeof link.headers?.Referer === "string" ? link.headers.Referer : "https://allanime.day";

    if (/repackager\.wixmp\.com/i.test(linkUrl)) {
      for (const variant of expandWixUrls(linkUrl)) {
        upsertStream(store, {
          url: variant,
          qualityLabel: inferQualityFromUrl(variant) ?? sourceName,
          referer,
          sourceName,
        });
      }
      continue;
    }

    if (URL_REGEX.test(linkUrl) && mightBeVideoStream(linkUrl)) {
      upsertStream(store, {
        url: linkUrl,
        qualityLabel: inferQualityFromUrl(linkUrl) ?? sourceName,
        referer,
        sourceName,
      });
    }
  }
}

async function fetchMp4uploadVideoUrl(embedUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
        Referer: "https://allanime.day",
      },
    });
    if (!response.ok) {
      return undefined;
    }

    const html = await response.text();
    const match = html.match(/src:\s*"([^"]+)"/);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

function extractProviders(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const episode = root.episode;
  if (!episode || typeof episode !== "object") {
    return [];
  }

  const sourceUrls = (episode as Record<string, unknown>).sourceUrls;
  if (!Array.isArray(sourceUrls)) {
    return [];
  }

  return sourceUrls.filter(item => Boolean(item) && typeof item === "object") as Array<Record<string, unknown>>;
}

function extractLinks(payload: unknown): Array<{ link?: string; src?: string; headers?: Record<string, string> }> {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const links = root.links;
  if (!Array.isArray(links)) {
    return [];
  }

  return links.filter(item => Boolean(item) && typeof item === "object") as Array<{
    link?: string;
    src?: string;
    headers?: Record<string, string>;
  }>;
}

function decryptProviderPath(providerId: string): string {
  let decrypted = "";
  for (let index = 0; index < providerId.length; index += 2) {
    const hexPair = providerId.slice(index, index + 2);
    const decimal = Number.parseInt(hexPair, 16);
    const xored = decimal ^ 56;
    const octal = xored.toString(8).padStart(3, "0");
    decrypted += String.fromCharCode(Number.parseInt(octal, 8));
  }

  return decrypted;
}

function upsertStream(store: Map<string, StreamOption>, option: StreamOption): void {
  if (!option.url || !URL_REGEX.test(option.url)) {
    return;
  }

  if (!store.has(option.url)) {
    store.set(option.url, option);
  }
}

function expandWixUrls(url: string): string[] {
  const stripped = url.split(".urlset")[0].replace("repackager.wixmp.com/", "");
  const segments = stripped.split(",");
  if (segments.length < 3) {
    return [url];
  }

  const prefix = segments[0];
  const suffix = segments[segments.length - 1];
  return segments.slice(1, -1).map(quality => `${prefix}${quality}${suffix}`);
}

function walk(value: unknown, visitor: (value: unknown) => void): void {
  visitor(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visitor);
    }

    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    walk(child, visitor);
  }
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function normalizeEpisodeId(value: string): string {
  return value.trim().replace(/^0+(?=\d)/, "");
}

function sortEpisodes(left: EpisodeItem, right: EpisodeItem): number {
  const leftNumeric = Number.parseFloat(left.id);
  const rightNumeric = Number.parseFloat(right.id);

  if (!Number.isNaN(leftNumeric) && !Number.isNaN(rightNumeric)) {
    return leftNumeric - rightNumeric;
  }

  return left.id.localeCompare(right.id, undefined, { numeric: true });
}

function inferQualityFromUrl(url: string): string | undefined {
  const match = url.match(/(2160|1440|1080|720|480|360|240)p/i);
  return match ? `${match[1]}p` : undefined;
}

function mightBeVideoStream(url: string): boolean {
  return /(m3u8|mp4|webm|manifest|playlist|dash|tools\.fast4speed\.rsvp|ok\.ru|streamwish|listeamed|streamsb|streamlare|bysekoze)/i.test(url);
}

function qualityRank(quality: string): number {
  const numeric = Number.parseInt(quality, 10);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  if (quality.toLowerCase() === "auto") {
    return 1;
  }

  return 0;
}

const PROVIDER_REFERERS: Record<string, string> = {
  "Default": "https://allanime.day",
  "Yt-mp4": "https://allanime.day",
  "S-mp4": "https://allanime.day",
  "Mp4": "https://allanime.day",
  "Ok": "https://allanime.day",
  "Sw": "https://allanime.day",
  "Vg": "https://allanime.day",
  "Fm-Hls": "https://allanime.day",
  "Ss-Hls": "https://allanime.day",
  "Sl-mp4": "https://allanime.day",
  "Ak": "https://allanime.day",
  "Luf-Mp4": "https://allanime.day",
  "Uv-mp4": "https://allanime.day",
  "Bg": "https://allanime.day",
  "Rf": "https://allanime.day",
};

export function isDirectVideoUrl(url: string): boolean {
  return /\.(m3u8|mp4|webm|mkv)(\?|$)/i.test(url)
    || /tools\.fast4speed\.rsvp/i.test(url)
    || /video\.wixstatic\.com/i.test(url);
}

export function getProviderReferer(sourceName: string, fallback?: string): string {
  return PROVIDER_REFERERS[sourceName] ?? fallback ?? "https://allanime.day";
}
