import React, { useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useAppState } from "./useAppState.js";
import { SearchScreen } from "./screens/SearchScreen.js";
import { ContinueWatchingScreen } from "./screens/ContinueWatchingScreen.js";
import { ResultsScreen } from "./screens/ResultsScreen.js";
import { EpisodesScreen } from "./screens/EpisodesScreen.js";
import { StreamPickerScreen } from "./screens/StreamPickerScreen.js";
import { PlayingScreen } from "./screens/PlayingScreen.js";
import { PostPlayScreen } from "./screens/PostPlayScreen.js";
import { SettingsScreen } from "./screens/SettingsScreen.js";

function displayedIndex(state: ReturnType<typeof useAppState>): number {
  const ep = state.episodes[state.playingRealIndex];
  if (!ep) return 0;
  const idx = state.displayedEpisodes.findIndex(e => e.id === ep.id);
  return idx >= 0 ? idx : 0;
}

export function App(): React.ReactElement {
  const state = useAppState();

  useInput((input: string, key: any) => {
    if (state.loading) return;

    switch (state.screen) {
      case "search":
        if (key.escape) process.exit(0);
        if (input === "s") state.setScreen("settings");
        break;

      case "settings":
        break;

      case "continue-watching":
        if (key.upArrow) state.setSelectedContinueIndex((p: number) => Math.max(p - 1, 0));
        else if (key.downArrow) state.setSelectedContinueIndex((p: number) => Math.min(p + 1, Math.max(state.continueList.length - 1, 0)));
        else if (key.return && state.continueList[state.selectedContinueIndex]) state.loadEpisodesFromContinue(state.continueList[state.selectedContinueIndex]);
        else if (key.escape) state.setScreen("search");
        break;

      case "results":
        if (key.upArrow) state.setSelectedSearchIndex((p: number) => Math.max(p - 1, 0));
        else if (key.downArrow) state.setSelectedSearchIndex((p: number) => Math.min(p + 1, Math.max(state.items.length - 1, 0)));
        else if (key.return && state.selectedTitle) state.loadEpisodes();
        else if (key.escape) state.setScreen("search");
        break;

      case "episodes":
        if (state.episodeSearchActive) {
          if (key.escape) { state.setEpisodeSearchActive(false); state.setEpisodeSearch(""); }
          break;
        }
        if (input === "/" || input === "f") state.setEpisodeSearchActive(true);
        else if (key.upArrow) state.setSelectedEpisodeIndex((p: number) => Math.max(p - 1, 0));
        else if (key.downArrow) state.setSelectedEpisodeIndex((p: number) => Math.min(p + 1, Math.max(state.displayedEpisodes.length - 1, 0)));
        else if (key.return && state.selectedEpisode) state.fetchAndShowStreams();
        else if (key.escape) state.setScreen("results");
        break;

      case "stream-picker":
        if (key.upArrow) state.setSelectedStreamIndex((p: number) => Math.max(p - 1, 0));
        else if (key.downArrow) state.setSelectedStreamIndex((p: number) => Math.min(p + 1, Math.max(state.streams.length - 1, 0)));
        else if (key.return) state.playSelectedStream();
        else if (key.escape) { state.setSelectedEpisodeIndex(displayedIndex(state)); state.setScreen("episodes"); }
        break;

      case "post-play":
        if (key.upArrow) state.setSelectedPostPlayIndex((p: number) => Math.max(p - 1, 0));
        else if (key.downArrow) state.setSelectedPostPlayIndex((p: number) => Math.min(p + 1, Math.max(state.postPlayOptions.length - 1, 0)));
        else if (key.return) {
          const action = state.postPlayOptions[state.selectedPostPlayIndex];
          if (action === "Next Episode") state.autoPlayNextEpisode(state.playingRealIndex + 1);
          else if (action === "Previous Episode") state.autoPlayNextEpisode(state.playingRealIndex - 1);
          else { state.setSelectedEpisodeIndex(displayedIndex(state)); state.setScreen("episodes"); }
        } else if (key.escape) { state.setSelectedEpisodeIndex(displayedIndex(state)); state.setScreen("episodes"); }
        break;
    }
  });

  useEffect(() => {
    if (state.screen === "results" && state.selectedSearchIndex >= state.items.length && state.items.length > 0)
      state.setSelectedSearchIndex(0);
  }, [state.screen, state.selectedSearchIndex, state.items.length]);

  useEffect(() => {
    if (state.screen === "episodes" && state.selectedEpisodeIndex >= state.displayedEpisodes.length && state.displayedEpisodes.length > 0)
      state.setSelectedEpisodeIndex(0);
  }, [state.screen, state.selectedEpisodeIndex, state.displayedEpisodes.length]);

  useEffect(() => {
    if (state.screen === "stream-picker" && state.selectedStreamIndex >= state.streams.length && state.streams.length > 0)
      state.setSelectedStreamIndex(0);
  }, [state.screen, state.selectedStreamIndex, state.streams.length]);

  useEffect(() => {
    if (state.screen === "post-play" && state.selectedPostPlayIndex >= state.postPlayOptions.length && state.postPlayOptions.length > 0)
      state.setSelectedPostPlayIndex(0);
  }, [state.screen, state.selectedPostPlayIndex, state.postPlayOptions.length]);

  switch (state.screen) {
    case "search":
      return <SearchScreen query={state.query} setQuery={state.setQuery} runSearch={state.runSearch} showContinueWatching={state.showContinueWatching} loading={state.loading} loadingLabel={state.loadingLabel} error={state.error} height={state.height} />;
    case "continue-watching":
      return <ContinueWatchingScreen continueList={state.continueList} selectedContinueIndex={state.selectedContinueIndex} error={state.error} height={state.height} />;
    case "results":
      return <ResultsScreen query={state.query} items={state.items} selectedSearchIndex={state.selectedSearchIndex} pagedResults={state.pagedResults} error={state.error} />;
    case "episodes":
      return <EpisodesScreen selectedTitle={state.selectedTitle} episodes={state.episodes} displayedEpisodes={state.displayedEpisodes} selectedEpisodeIndex={state.selectedEpisodeIndex} episodeSearch={state.episodeSearch} setEpisodeSearch={state.setEpisodeSearch} episodeSearchActive={state.episodeSearchActive} setEpisodeSearchActive={state.setEpisodeSearchActive} pagedEpisodes={state.pagedEpisodes} coverImage={state.coverImage} watchedData={state.watchedData} totalEpisodes={state.totalEpisodes} metadata={state.metadata} error={state.error} />;
    case "stream-picker":
      return <StreamPickerScreen selectedTitle={state.selectedTitle} selectedEpisode={state.selectedEpisode} streams={state.streams} selectedStreamIndex={state.selectedStreamIndex} error={state.error} height={state.height} />;
    case "playing":
      return <PlayingScreen selectedTitle={state.selectedTitle} selectedEpisode={state.selectedEpisode} loadingLabel={state.loadingLabel} />;
    case "post-play":
      return <PostPlayScreen postPlayOptions={state.postPlayOptions} selectedPostPlayIndex={state.selectedPostPlayIndex} />;
    case "settings":
      return <SettingsScreen selectedPlayer={state.selectedPlayer} onSelectPlayer={state.setSelectedPlayer} onClose={() => state.setScreen("search")} />;
    default:
      return <Box><Text>Unknown state</Text></Box>;
  }
}
