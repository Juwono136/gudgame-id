export const GLOBAL_SEARCH_RESULT_TYPES = [
  "player",
  "gear",
  "tournament",
  "news",
] as const;

export type GlobalSearchResultType = (typeof GLOBAL_SEARCH_RESULT_TYPES)[number];

export const GLOBAL_SEARCH_PLACEHOLDER =
  "Search athletes, gear, tournaments, news…";

export const GLOBAL_SEARCH_EMPTY_HINT =
  "Type at least 2 characters to search players, gear, tournaments, and news.";

export const GLOBAL_SEARCH_TYPE_LABELS: Record<GlobalSearchResultType, string> = {
  player: "Players",
  gear: "Gear",
  tournament: "Tournaments",
  news: "News",
};
