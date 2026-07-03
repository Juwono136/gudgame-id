import "server-only";

import {
  getActivePlayerLeaderboard,
  mapLeaderboardEntryToListItem,
  type ActivePlayerLeaderboardEntry,
} from "@/lib/wiki/player-leaderboard";
import type { PublicPlayersListQuery } from "@/lib/validations/public-wiki";

export type PublicPlayerListItem = {
  rank: number;
  slug: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  nationality: string | null;
  province: string | null;
  age: number | null;
  points: number | null;
  tier: string | null;
  tierLevel: string | null;
  playingStyle: string | null;
  winRate: number | null;
  worldRank: number | null;
  yearsActive: string | null;
  summary: string | null;
};

function stripRichTextSummary(html: string | null): string | null {
  if (!html?.trim()) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length ? text.slice(0, 160) : null;
}

function filterLeaderboard(
  entries: ActivePlayerLeaderboardEntry[],
  search?: string,
): ActivePlayerLeaderboardEntry[] {
  const term = search?.trim().toLowerCase();
  if (!term) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.displayName,
      entry.nickname,
      entry.summary,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

function sortLeaderboard(
  entries: ActivePlayerLeaderboardEntry[],
  sortBy: PublicPlayersListQuery["sortBy"],
  sortDir: PublicPlayersListQuery["sortDir"],
): ActivePlayerLeaderboardEntry[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const sorted = [...entries];

  sorted.sort((a, b) => {
    if (sortBy === "name") {
      return dir * a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
    }

    const pointsDiff = (a.totalPoints - b.totalPoints) * dir;
    if (pointsDiff !== 0) return pointsDiff;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
  });

  return sorted;
}

export async function listPublishedPlayersPaginated(
  sportSlug: string,
  query: PublicPlayersListQuery,
): Promise<{
  items: PublicPlayerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { page, pageSize, search, sortBy, sortDir } = query;
  const offset = (page - 1) * pageSize;

  const leaderboard = await getActivePlayerLeaderboard(sportSlug);
  const filtered = filterLeaderboard(leaderboard, search);
  const sorted =
    sortBy === "rank"
      ? sortDir === "asc"
        ? [...filtered].reverse()
        : filtered
      : sortLeaderboard(filtered, sortBy, sortDir);

  const total = sorted.length;
  const pageRows = sorted.slice(offset, offset + pageSize);

  const items: PublicPlayerListItem[] = pageRows.map((entry) => {
    const mapped = mapLeaderboardEntryToListItem(entry);
    return {
      ...mapped,
      summary: stripRichTextSummary(entry.summary),
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
