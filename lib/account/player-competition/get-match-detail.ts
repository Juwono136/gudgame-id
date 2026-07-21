import "server-only";

import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  playerMatches,
  playerTournamentResults,
  type MatchResultType,
  type StatsTier,
} from "@/db/schema/player-competition";
import { sports } from "@/db/schema/sports";
import {
  tournamentBracketMatches,
  tournamentReclubMatches,
} from "@/db/schema/tournament-matches";
import {
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournaments } from "@/db/schema/tournaments";
import { parseOpponentTeams } from "@/lib/account/player-competition/format-match";
import {
  computePlayerMatchStats,
  computeTournamentUserStats,
  computeSportRank,
} from "@/lib/account/player-performance/compute";
import { rankingDeltaForMatch } from "@/lib/account/player-performance/points";
import { formatPlayerTierLabel } from "@/lib/player/tier";
import type {
  PlayerMatchDetail,
  PlayerMatchListItem,
  PlayerMatchSourceDetail,
} from "@/lib/account/player-competition/types";
import { normalizePlayerCompetitionType } from "@/lib/tournaments/core/types";

function mapListFields(row: {
  id: number; tournamentId: string | null;
  tournamentName: string;
  opponents: string;
  resultType: string;
  score: string | null;
  round: string | null;
  playedAt: Date;
  isOfficial: boolean;
  sportName: string | null;
  sportSlug: string | null;
  tournamentSlug: string | null;
  venue: string | null;
  tournamentType: string | null;
}): PlayerMatchListItem {
  const isOfficial = row.isOfficial;
  const tournamentType = normalizePlayerCompetitionType(row.tournamentType, isOfficial);

  return {
    id: row.id,
    tournamentId: row.tournamentId,
    tournamentName: row.tournamentName,
    opponents: row.opponents,
    resultType: row.resultType as MatchResultType,
    score: row.score,
    round: row.round,
    playedAt: row.playedAt.toISOString(),
    isOfficial,
    tournamentType,
    sportName: row.sportName,
    sportSlug: row.sportSlug,
    tournamentSlug: row.tournamentSlug,
    venue: row.venue,
  };
}

function scoresMatch(
  scoreLabel: string | null,
  scoreA: number | null,
  scoreB: number | null,
): boolean {
  if (!scoreLabel || scoreA == null || scoreB == null) return true;
  const normalized = scoreLabel.replace(/\s/g, "");
  return (
    normalized === `${scoreA}–${scoreB}` ||
    normalized === `${scoreA}-${scoreB}` ||
    normalized === `${scoreB}–${scoreA}` ||
    normalized === `${scoreB}-${scoreA}`
  );
}

async function findSourceMatch(
  row: PlayerMatchListItem,
): Promise<PlayerMatchSourceDetail | null> {
  if (!row.tournamentId) return null;

  const teams = parseOpponentTeams(row.opponents);
  if (!teams) return null;

  const [teamA, teamB] = teams;
  const db = getDb();

  if (!row.isOfficial) {
    const candidates = await db
      .select()
      .from(tournamentReclubMatches)
      .where(
        and(
          eq(tournamentReclubMatches.tournamentId, row.tournamentId),
          or(
            and(
              eq(tournamentReclubMatches.teamAName, teamA),
              eq(tournamentReclubMatches.teamBName, teamB),
            ),
            and(
              eq(tournamentReclubMatches.teamAName, teamB),
              eq(tournamentReclubMatches.teamBName, teamA),
            ),
          ),
        ),
      );

    const match =
      candidates.find((c) => scoresMatch(row.score, c.scoreA, c.scoreB)) ?? candidates[0];
    if (!match) return null;

    return {
      kind: "reclub",
      roundNumber: match.roundNumber,
      matchNumber: null,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      durationSeconds: match.durationSeconds,
      summary: match.summary,
      status: match.status,
      startedAt: match.startedAt?.toISOString() ?? null,
      endedAt: match.endedAt?.toISOString() ?? null,
    };
  }

  const candidates = await db
    .select()
    .from(tournamentBracketMatches)
    .where(
      and(
        eq(tournamentBracketMatches.tournamentId, row.tournamentId),
        or(
          and(
            eq(tournamentBracketMatches.teamAName, teamA),
            eq(tournamentBracketMatches.teamBName, teamB),
          ),
          and(
            eq(tournamentBracketMatches.teamAName, teamB),
            eq(tournamentBracketMatches.teamBName, teamA),
          ),
        ),
      ),
    );

  const match =
    candidates.find((c) => scoresMatch(row.score, c.scoreA, c.scoreB)) ?? candidates[0];
  if (!match) return null;

  return {
    kind: "bracket",
    roundNumber: match.roundNumber,
    matchNumber: match.matchNumber,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    durationSeconds: null,
    summary: null,
    status: match.status,
    startedAt: match.scheduledAt?.toISOString() ?? null,
    endedAt: match.completedAt?.toISOString() ?? null,
  };
}

export async function getPlayerMatchDetail(
  userId: string,
  matchId: number,
): Promise<PlayerMatchDetail | null> {
  const db = getDb();

  const [row] = await db
    .select({
      id: playerMatches.id,
      tournamentId: playerMatches.tournamentId,
      tournamentName: playerMatches.tournamentName,
      opponents: playerMatches.opponents,
      resultType: playerMatches.resultType,
      score: playerMatches.score,
      round: playerMatches.round,
      playedAt: playerMatches.playedAt,
      isOfficial: playerMatches.isOfficial,
      statsTier: playerMatches.statsTier,
      sportId: playerMatches.sportId,
      createdAt: playerMatches.createdAt,
      sportName: sports.name,
      sportSlug: sports.slug,
      tournamentSlug: tournaments.slug,
      venue: tournaments.venue,
      tournamentType: tournaments.tournamentType,
      tournamentStatus: tournaments.status,
      tournamentStartsAt: tournaments.startsAt,
      tournamentEndsAt: tournaments.endsAt,
    })
    .from(playerMatches)
    .leftJoin(tournaments, eq(playerMatches.tournamentId, tournaments.id))
    .leftJoin(sports, eq(tournaments.sportId, sports.id))
    .where(and(eq(playerMatches.id, matchId), eq(playerMatches.userId, userId)))
    .limit(1);

  if (!row) return null;

  const listFields = mapListFields(row);

  let userTeamName: string | null = null;
  if (row.tournamentId) {
    const [teamRow] = await db
      .select({ name: tournamentTeams.name })
      .from(tournamentTeamMembers)
      .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
      .where(
        and(
          eq(tournamentTeamMembers.userId, userId),
          eq(tournamentTeams.tournamentId, row.tournamentId),
        ),
      )
      .limit(1);
    userTeamName = teamRow?.name ?? null;
  }

  const source = await findSourceMatch(listFields);

  let tournamentContext = {
    userWins: 0,
    userLosses: 0,
    userMatches: 0,
    userWinRate: null as number | null,
    pointsEarned: rankingDeltaForMatch({
      isOfficial: row.isOfficial,
      statsTier: row.statsTier as StatsTier | null,
      resultType: row.resultType === "win" ? "win" : "loss",
    }),
    placement: null as string | null,
  };

  if (row.tournamentId) {
    const tStats = await computeTournamentUserStats(userId, row.tournamentId);
    tournamentContext = {
      ...tournamentContext,
      userWins: tStats.wins,
      userLosses: tStats.losses,
      userMatches: tStats.totalMatches,
      userWinRate: tStats.winRate,
    };

    const [placementRow] = await db
      .select({ placement: playerTournamentResults.placement })
      .from(playerTournamentResults)
      .where(
        and(
          eq(playerTournamentResults.userId, userId),
          eq(playerTournamentResults.tournamentId, row.tournamentId),
        ),
      )
      .limit(1);
    tournamentContext.placement = placementRow?.placement ?? null;
  }

  const careerAgg = await computePlayerMatchStats(userId, row.sportId ?? undefined);
  const worldRank =
    row.sportId && careerAgg.totalPoints > 0
      ? await computeSportRank(row.sportId, userId, careerAgg.totalPoints)
      : null;

  return {
    ...listFields,
    userTeamName,
    statsTier: row.statsTier,
    tournamentStatus: row.tournamentStatus,
    tournamentStartsAt: row.tournamentStartsAt?.toISOString() ?? null,
    tournamentEndsAt: row.tournamentEndsAt?.toISOString() ?? null,
    recordedAt: row.createdAt.toISOString(),
    source,
    tournamentContext,
    careerSnapshot: {
      totalPoints: careerAgg.totalPoints,
      winRate: careerAgg.winRate,
      tier: careerAgg.tierLevel ? formatPlayerTierLabel(careerAgg.tierLevel) : null,
      tierLevel: careerAgg.tierLevel,
      totalMatches: careerAgg.totalMatches,
      wins: careerAgg.wins,
      losses: careerAgg.losses,
      worldRank,
    },
  };
}
