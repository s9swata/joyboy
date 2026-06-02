export interface AnimeMetadata {
  title: string;
  coverUrl?: string;
  synopsis?: string;
  score?: number;
  status?: string;
  genres?: string[];
  episodes?: number;
  year?: number;
}

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const MEDIA_BY_ID_QUERY = `
  query ($id: Int!) {
    Media(id: $id, type: ANIME) {
      title { english romaji }
      coverImage { extraLarge large }
      description(asHtml: false)
      averageScore
      status
      genres
      episodes
      startDate { year }
    }
  }
`;

const MEDIA_BY_SEARCH_QUERY = `
  query ($search: String!) {
    Media(search: $search, type: ANIME) {
      title { english romaji }
      coverImage { extraLarge large }
      description(asHtml: false)
      averageScore
      status
      genres
      episodes
      startDate { year }
    }
  }
`;

async function queryAniList(query: string, variables: Record<string, unknown>): Promise<AnimeMetadata | undefined> {
  try {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "joyboy/1.0",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) return undefined;

    const payload = (await response.json()) as any;
    if (payload.errors?.length) return undefined;

    const media = payload.data?.Media;
    if (!media) return undefined;

    return {
      title: media.title?.english ?? media.title?.romaji ?? "",
      coverUrl: media.coverImage?.extraLarge ?? media.coverImage?.large,
      synopsis: media.description?.replace(/<[^>]+>/g, "") ?? undefined,
      score: media.averageScore ? media.averageScore / 10 : undefined,
      status: media.status ?? undefined,
      genres: media.genres ?? undefined,
      episodes: media.episodes ?? undefined,
      year: media.startDate?.year ?? undefined,
    };
  } catch {
    return undefined;
  }
}

export async function fetchAniListMetadata(anilistId: number): Promise<AnimeMetadata | undefined> {
  return queryAniList(MEDIA_BY_ID_QUERY, { id: anilistId });
}

export async function fetchAniListMetadataByTitle(title: string): Promise<AnimeMetadata | undefined> {
  const search = title.trim();
  if (!search) return undefined;
  return queryAniList(MEDIA_BY_SEARCH_QUERY, { search });
}
