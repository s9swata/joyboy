export type TranslationType = "sub" | "dub";

export interface SearchVariables {
  search: { query: string; isManga: boolean };
  limit: number;
  page: number;
  translationType: TranslationType;
  countryOrigin: "ALL" | string;
}

export interface DetailVariables {
  _id: string;
  search: { allowAdult: boolean; allowUnknown: boolean };
}

export interface ChapterPagesVariables {
  mangaId: string;
  translationType: TranslationType;
  chapterString: string;
  limit: number;
  offset: number;
}

export interface PersistedQueryResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

export interface SearchItem {
  id: string;
  title: string;
  thumbnail?: string;
  anilistId?: number;
}

export interface SearchResult {
  items: SearchItem[];
  raw: unknown;
}

export interface EpisodeItem {
  id: string;
  label: string;
}

export interface StreamOption {
  url: string;
  qualityLabel: string;
  referer?: string;
  sourceName?: string;
}
