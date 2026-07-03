import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";
import { getFunMatchSessionViews } from "@/lib/tournaments/fun-match/session-views";
import {
  getReclubMatchHistoryKey,
  type ReclubMatchView,
} from "@/lib/tournaments/reclub/types";

export const RECENT_MATCHES_PREVIEW_LIMIT = 5;

export type RecentMatchRow = {
  id: string;
  roundLabel: string;
  matchNumber: number | null;
  teamAName: string;
  teamBName: string;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  playedAt: string | null;
  playersSummary: string | null;
  durationSeconds: number | null;
  winnerName: string | null;
};

function isActiveMatchStatus(status: string): boolean {
  return status === "completed" || status === "in_progress";
}

export function mapReclubMatchesToRecentRows(matches: ReclubMatchView[]): RecentMatchRow[] {
  const rows = matches
    .filter((m) => isActiveMatchStatus(m.status) && m.teamAName && m.teamBName)
    .map((m) => {
      const players = [...m.teamAPlayers, ...m.teamBPlayers].filter(Boolean);
      const scoreA = m.scoreA;
      const scoreB = m.scoreB;
      let winnerName: string | null = null;
      if (m.status === "completed" && scoreA != null && scoreB != null && scoreA !== scoreB) {
        winnerName = scoreA > scoreB ? m.teamAName! : m.teamBName!;
      }

      return {
        id: getReclubMatchHistoryKey(m),
        roundLabel: m.roundLabel ?? `Round ${m.roundNumber}`,
        matchNumber: null,
        teamAName: m.teamAName!,
        teamBName: m.teamBName!,
        scoreA,
        scoreB,
        status: m.status,
        playedAt: m.endedAt ?? m.startedAt,
        playersSummary: players.length ? players.join(" · ") : null,
        durationSeconds: m.durationSeconds,
        winnerName,
        sortRound: m.roundNumber,
      };
    });

  const statusRank = (s: string) =>
    s === "in_progress" ? 3 : s === "completed" ? 2 : 1;

  return rows
    .sort((a, b) => {
      const rankDiff = statusRank(b.status) - statusRank(a.status);
      if (rankDiff !== 0) return rankDiff;
      const aTime = a.playedAt ? new Date(a.playedAt).getTime() : 0;
      const bTime = b.playedAt ? new Date(b.playedAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b.sortRound ?? 0) - (a.sortRound ?? 0);
    })
    .slice(0, RECENT_MATCHES_PREVIEW_LIMIT)
    .map(({ sortRound: _sortRound, ...row }) => row);
}

/** Recent rounds for overview — same source as Live Score & History tabs. */
export function mapLivePayloadToRecentRows(
  liveData: TournamentLivePayload | undefined,
): RecentMatchRow[] {
  if (!liveData?.matches?.length) return [];
  const views = getFunMatchSessionViews(liveData).filter(
    (m) => m.status === "completed" || m.status === "in_progress",
  );
  return mapReclubMatchesToRecentRows(views);
}

export function mapBracketMatchesToRecentRows(matches: BracketMatchView[]): RecentMatchRow[] {
  if (!matches.length) return [];

  const maxRound = Math.max(...matches.map((m) => m.roundNumber), 1);

  const rows = matches
    .filter((m) => m.status !== "bye" && m.teamAName && m.teamBName)
    .map((m) => {
      const scoreA = m.scoreA;
      const scoreB = m.scoreB;
      let winnerName: string | null = null;
      if (m.status === "completed" && scoreA != null && scoreB != null && scoreA !== scoreB) {
        winnerName = scoreA > scoreB ? m.teamAName! : m.teamBName!;
      } else if (m.winnerTeamId) {
        winnerName =
          m.winnerTeamId === m.teamAId
            ? m.teamAName
            : m.winnerTeamId === m.teamBId
              ? m.teamBName
              : null;
      }

      return {
        id: m.id,
        roundLabel: getBracketRoundLabel(m.roundNumber, maxRound),
        matchNumber: m.matchNumber,
        teamAName: m.teamAName!,
        teamBName: m.teamBName!,
        scoreA,
        scoreB,
        status: m.status,
        playedAt: null,
        playersSummary: null,
        durationSeconds: null,
        winnerName,
        sortRound: m.roundNumber * 100 + m.matchNumber,
      };
    });

  return rows
    .sort((a, b) => {
      const statusRank = (s: string) =>
        s === "in_progress" ? 3 : s === "completed" ? 2 : 1;
      const rankDiff = statusRank(b.status) - statusRank(a.status);
      if (rankDiff !== 0) return rankDiff;
      return (b.sortRound ?? 0) - (a.sortRound ?? 0);
    })
    .slice(0, RECENT_MATCHES_PREVIEW_LIMIT)
    .map(({ sortRound: _sortRound, ...row }) => row);
}
