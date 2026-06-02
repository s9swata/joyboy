import { API_ENDPOINT, PERSISTED_HASHES, REFERERS } from "./constants.js";
import { createDecipheriv, createHash } from "node:crypto";
import type {
  ChapterPagesVariables,
  DetailVariables,
  PersistedQueryResponse,
  SearchResult,
  SearchVariables,
} from "./types.js";

type RefererProfile = "metadata" | "source" | "image";

const SHOWS_SEARCH_QUERY =
  "query ($search: SearchInput, $limit: Int, $page: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) { shows(search: $search, limit: $limit, page: $page, translationType: $translationType, countryOrigin: $countryOrigin) { edges { _id name englishName thumbnail availableEpisodes } } }";
const SHOW_EPISODES_QUERY =
  "query ($showId: String!) { show(_id: $showId) { availableEpisodes availableEpisodesDetail } }";
const EPISODE_SOURCES_QUERY =
  "query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) { episodeString sourceUrls } }";

export class AllanimeClient {
  public readonly userAgent: string;

  public constructor(userAgent?: string) {
    this.userAgent =
      userAgent ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0";
  }

  public async search(variables: SearchVariables): Promise<SearchResult> {
    const json = await this.executePersistedQuery<unknown>(variables, PERSISTED_HASHES.search, "metadata");
    const items = this.extractSearchItems(json.data);
    return { items, raw: json.data };
  }

  public async detail(variables: DetailVariables): Promise<unknown> {
    const json = await this.executePersistedQuery<unknown>(variables, PERSISTED_HASHES.detail, "metadata");
    return json.data;
  }

  public async searchShowsGraphql(variables: SearchVariables): Promise<unknown> {
    const payload = await this.executeQueryPost<unknown>(SHOWS_SEARCH_QUERY, variables, "source");
    return this.unwrapEncryptedData(payload);
  }

  public async showEpisodes(showId: string): Promise<unknown> {
    const payload = await this.executeQueryPost<unknown>(SHOW_EPISODES_QUERY, { showId }, "source");
    return this.unwrapEncryptedData(payload);
  }

  public async episodeSources(showId: string, translationType: string, episodeString: string): Promise<unknown> {
    let payload: PersistedQueryResponse<unknown>;
    try {
      payload = await this.executePersistedQuery<unknown>(
        { showId, translationType, episodeString },
        PERSISTED_HASHES.episodeSources,
        "source",
      );
    } catch {
      payload = await this.executeQueryPost<unknown>(
        EPISODE_SOURCES_QUERY,
        { showId, translationType, episodeString },
        "source",
      );
    }
    return this.unwrapEncryptedData(payload);
  }

  public async fetchProviderPayload(pathOrUrl: string): Promise<unknown> {
    const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `https://allanime.day${pathOrUrl}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": this.userAgent,
        Referer: REFERERS.metadata,
      },
    });

    if (!response.ok) {
      throw new Error(`Provider fetch failed with ${response.status}`);
    }

    return response.json();
  }

  public async chapterPages(variables: ChapterPagesVariables): Promise<unknown> {
    const json = await this.executePersistedQuery<unknown>(variables, PERSISTED_HASHES.chapterPages, "metadata");
    return json.data;
  }

  public async executePersistedQuery<T>(
    variables: object,
    hash: string,
    profile: RefererProfile,
  ): Promise<PersistedQueryResponse<T>> {
    const params = new URLSearchParams({
      variables: JSON.stringify(variables),
      extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }),
    });

    const response = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
      method: "GET",
      headers: {
        "User-Agent": this.userAgent,
        Referer: REFERERS[profile],
        Origin: REFERERS[profile],
      },
    });

    if (!response.ok) {
      throw new Error(`AllAnime request failed with ${response.status}`);
    }

    const json = (await response.json()) as PersistedQueryResponse<T>;
    if (json.errors?.length) {
      const message = json.errors.map(error => error.message).filter(Boolean).join("; ");
      throw new Error(`AllAnime error: ${message || "Unknown error"}`);
    }

    return json;
  }

  public async executeQueryPost<T>(
    query: string,
    variables: object,
    profile: RefererProfile,
  ): Promise<PersistedQueryResponse<T>> {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "User-Agent": this.userAgent,
        Referer: REFERERS[profile],
        Origin: REFERERS[profile],
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`AllAnime request failed with ${response.status}`);
    }

    const json = (await response.json()) as PersistedQueryResponse<T>;
    if (json.errors?.length) {
      const message = json.errors.map(error => error.message).filter(Boolean).join("; ");
      throw new Error(`AllAnime error: ${message || "Unknown error"}`);
    }

    return json;
  }

  private extractSearchItems(payload: unknown): SearchResult["items"] {
    const edges = this.findEdges(payload);
    return edges
      .map(edge => {
        if (!edge || typeof edge !== "object") {
          return undefined;
        }

        const obj = edge as Record<string, unknown>;
        const id = this.pickString(obj, ["_id", "id"]);
        const title = this.pickString(obj, ["name", "title", "englishName", "romajiName"]);

        if (!id || !title) {
          return undefined;
        }

        return {
          id,
          title,
          thumbnail: this.pickString(obj, ["thumbnail"]),
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
  }

  private findEdges(payload: unknown): unknown[] {
    if (!payload || typeof payload !== "object") {
      return [];
    }

    const root = payload as Record<string, unknown>;
    const data = root.data as Record<string, unknown> | undefined;
    const candidates = [root, data].filter(Boolean) as Array<Record<string, unknown>>;

    for (const candidate of candidates) {
      for (const value of Object.values(candidate)) {
        if (!value || typeof value !== "object") {
          continue;
        }

        const record = value as Record<string, unknown>;
        if (Array.isArray(record.edges)) {
          return record.edges;
        }
      }
    }

    return [];
  }

  private pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private unwrapEncryptedData<T>(payload: PersistedQueryResponse<T>): T | undefined {
    if (!payload.data || typeof payload.data !== "object") {
      return payload.data;
    }

    const data = payload.data as Record<string, unknown>;
    const tobeparsed = data.tobeparsed;
    if (typeof tobeparsed !== "string") {
      return payload.data;
    }

    const decrypted = this.decryptTobeParsed(tobeparsed);
    return decrypted as T;
  }

  private decryptTobeParsed(value: string): unknown {
    const raw = Buffer.from(value, "base64");
    if (raw.length <= 13) {
      throw new Error("Encrypted payload too short");
    }

    const iv = raw.subarray(1, 13);
    const ctLen = raw.length - 13 - 16;
    const ciphertext = raw.subarray(13, 13 + ctLen);
    const key = this.sha256("Xot36i3lK3:v1");
    const ctrIv = Buffer.concat([iv, Buffer.from([0, 0, 0, 2])]);
    const decipher = createDecipheriv("aes-256-ctr", key, ctrIv);
    const decoded = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");

    const firstBrace = decoded.indexOf("{");
    if (firstBrace < 0) {
      throw new Error("AllAnime decryption failed - no JSON found");
    }

    for (let i = decoded.length - 1; i >= firstBrace; i--) {
      if (decoded[i] === "}") {
        try {
          return JSON.parse(decoded.slice(firstBrace, i + 1));
        } catch {
          break;
        }
      }
    }

    throw new Error("AllAnime decryption failed - encryption key may have changed. Check for updates.");
  }

  private sha256(input: string): Buffer {
    return createHash("sha256").update(input).digest();
  }
}
