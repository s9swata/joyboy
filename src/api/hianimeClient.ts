import type { StreamOption } from "./types.js";

const HI_ANIME_BASE = "https://megaplay.buzz";

export class HianimeClient {
  private readonly userAgent: string;

  public constructor(userAgent?: string) {
    this.userAgent =
      userAgent ??
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
  }

  public async getStreamByAniwatchId(aniwatchEpId: string, language: "sub" | "dub" = "sub"): Promise<StreamOption> {
    const url = `${HI_ANIME_BASE}/stream/s-2/${aniwatchEpId}/${language}`;
    return {
      url: url,
      qualityLabel: language === "dub" ? "Dub (Hianime)" : "Sub (Hianime)",
      referer: HI_ANIME_BASE,
      sourceName: "Hianime",
    };
  }

  public async getStreamByMalId(malId: string, episode: number, language: "sub" | "dub" = "sub"): Promise<StreamOption> {
    const url = `${HI_ANIME_BASE}/stream/mal/${malId}/${episode}/${language}`;
    return {
      url: url,
      qualityLabel: language === "dub" ? "Dub (Hianime)" : "Sub (Hianime)",
      referer: HI_ANIME_BASE,
      sourceName: "Hianime",
    };
  }

  public async getStreamByAniListId(anilistId: string, episode: number, language: "sub" | "dub" = "sub"): Promise<StreamOption> {
    const url = `${HI_ANIME_BASE}/stream/ani/${anilistId}/${episode}/${language}`;
    return {
      url: url,
      qualityLabel: language === "dub" ? "Dub (Hianime)" : "Sub (Hianime)",
      referer: HI_ANIME_BASE,
      sourceName: "Hianime",
    };
  }

  public isHianimeUrl(url: string): boolean {
    return url.includes("megaplay.buzz");
  }
}