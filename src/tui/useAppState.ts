import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useStdout } from "ink";
import type { EpisodeItem, SearchItem, StreamOption } from "@/api/types.js";
import type { AnimeWatchData } from "@/services/watchHistory.js";
import type { Screen } from "./constants.js";
import { PAGE_SIZE } from "./constants.js";
import { getPageSlice } from "./utils.js";
import * as actions from "./appActions.js";

export interface AppState {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  query: string;
  setQuery: (query: string) => void;
  items: SearchItem[];
  setItems: (items: SearchItem[]) => void;
  episodes: EpisodeItem[];
  setEpisodes: (eps: EpisodeItem[]) => void;
  streams: StreamOption[];
  setStreams: (streams: StreamOption[]) => void;
  selectedSearchIndex: number;
  setSelectedSearchIndex: Dispatch<SetStateAction<number>>;
  selectedEpisodeIndex: number;
  setSelectedEpisodeIndex: Dispatch<SetStateAction<number>>;
  selectedStreamIndex: number;
  setSelectedStreamIndex: Dispatch<SetStateAction<number>>;
  selectedContinueIndex: number;
  setSelectedContinueIndex: Dispatch<SetStateAction<number>>;
  selectedPostPlayIndex: number;
  setSelectedPostPlayIndex: Dispatch<SetStateAction<number>>;
  episodeSearch: string;
  setEpisodeSearch: (s: string) => void;
  episodeSearchActive: boolean;
  setEpisodeSearchActive: (b: boolean) => void;
  playingRealIndex: number;
  setPlayingRealIndex: (n: number) => void;
  loading: boolean;
  loadingLabel: string | null;
  error: string | null;
  status: string | null;
  coverImage: string | null;
  metadata: any;
  continueList: AnimeWatchData[];
  totalEpisodes: number;
  watchedData: AnimeWatchData | null;
  height: number;
  selectedTitle: SearchItem | undefined;
  displayedEpisodes: EpisodeItem[];
  selectedEpisode: EpisodeItem | undefined;
  pagedResults: { start: number; items: SearchItem[] };
  pagedEpisodes: { start: number; items: EpisodeItem[] };
  postPlayOptions: string[];
  runSearch: (searchValue: string) => Promise<void>;
  loadEpisodes: () => Promise<void>;
  fetchAndShowStreams: () => Promise<void>;
  playSelectedStream: () => Promise<void>;
  autoPlayNextEpisode: (realIndex: number) => Promise<void>;
  showContinueWatching: () => Promise<void>;
  loadEpisodesFromContinue: (data: AnimeWatchData) => Promise<void>;
  setLoading: (b: boolean) => void;
  setLoadingLabel: (s: string | null) => void;
  setError: (s: string | null) => void;
  setStatus: (s: string | null) => void;
  setCoverImage: (s: string | null) => void;
  setMetadata: (m: any) => void;
  setWatchedData: (d: AnimeWatchData | null) => void;
  setContinueList: (list: AnimeWatchData[]) => void;
  setTotalEpisodes: (n: number) => void;
}

export function useAppState(): AppState {
  const { stdout } = useStdout();
  const height = stdout?.rows ?? 24;

  const [screen, setScreen] = useState<Screen>("search");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [streams, setStreams] = useState<StreamOption[]>([]);

  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0);
  const [selectedStreamIndex, setSelectedStreamIndex] = useState(0);
  const [selectedContinueIndex, setSelectedContinueIndex] = useState(0);
  const [selectedPostPlayIndex, setSelectedPostPlayIndex] = useState(0);
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [episodeSearchActive, setEpisodeSearchActive] = useState(false);
  const [playingRealIndex, setPlayingRealIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [continueList, setContinueList] = useState<AnimeWatchData[]>([]);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [watchedData, setWatchedData] = useState<AnimeWatchData | null>(null);

  const selectedTitle = useMemo(() => items[selectedSearchIndex], [items, selectedSearchIndex]);

  const displayedEpisodes = useMemo(() => {
    const q = episodeSearch.trim();
    if (!q) return episodes;
    return episodes.filter(ep => ep.label.toLowerCase().includes(q.toLowerCase()));
  }, [episodes, episodeSearch]);

  const selectedEpisode = useMemo(() => displayedEpisodes[selectedEpisodeIndex], [displayedEpisodes, selectedEpisodeIndex]);

  const pagedResults = useMemo(() => getPageSlice(items, selectedSearchIndex, PAGE_SIZE), [items, selectedSearchIndex]);
  const pagedEpisodes = useMemo(() => getPageSlice(displayedEpisodes, selectedEpisodeIndex, PAGE_SIZE), [displayedEpisodes, selectedEpisodeIndex]);

  const postPlayOptions = useMemo(() => {
    const opts: string[] = [];
    if (playingRealIndex < episodes.length - 1) opts.push("Next Episode");
    if (playingRealIndex > 0) opts.push("Previous Episode");
    opts.push("Back to Episodes");
    return opts;
  }, [playingRealIndex, episodes.length]);

  const s: AppState = {
    screen, setScreen, query, setQuery, items, setItems, episodes, setEpisodes,
    streams, setStreams, selectedSearchIndex, setSelectedSearchIndex,
    selectedEpisodeIndex, setSelectedEpisodeIndex, selectedStreamIndex, setSelectedStreamIndex,
    selectedContinueIndex, setSelectedContinueIndex, selectedPostPlayIndex, setSelectedPostPlayIndex,
    episodeSearch, setEpisodeSearch, episodeSearchActive, setEpisodeSearchActive,
    playingRealIndex, setPlayingRealIndex,
    loading, loadingLabel, error, status, coverImage, metadata,
    continueList, totalEpisodes, watchedData, height,
    selectedTitle, displayedEpisodes, selectedEpisode,
    pagedResults, pagedEpisodes, postPlayOptions,
    runSearch: (v) => actions.runSearch(s, v),
    loadEpisodes: () => actions.loadEpisodes(s),
    fetchAndShowStreams: () => actions.fetchAndShowStreams(s),
    playSelectedStream: () => actions.playSelectedStream(s),
    autoPlayNextEpisode: (n) => actions.autoPlayNextEpisode(s, n),
    showContinueWatching: () => actions.showContinueWatching(s),
    loadEpisodesFromContinue: (d) => actions.loadEpisodesFromContinue(s, d),
    setLoading, setLoadingLabel, setError, setStatus, setCoverImage, setMetadata,
    setWatchedData, setContinueList, setTotalEpisodes,
  };

  return s;
}
