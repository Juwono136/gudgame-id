import "server-only";

import { AppError } from "@/lib/errors";
import {
  isLiveOrCompletedPhase,
  resolveTournamentLivePhase,
  TOURNAMENT_NOT_STARTED_MESSAGE,
  type TournamentLivePhase,
} from "@/lib/tournaments/core/types";
import type { TournamentDetail } from "@/lib/tournaments/service";

export function getTournamentLivePhase(tournament: TournamentDetail): TournamentLivePhase {
  return resolveTournamentLivePhase(tournament.status);
}

export function assertTournamentLiveForScoring(tournament: TournamentDetail): void {
  const phase = getTournamentLivePhase(tournament);
  if (phase !== "live") {
    throw new AppError(
      phase === "completed"
        ? "Tournament has ended; scores can no longer be updated."
        : "Scores can only be submitted while the tournament is live.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }
}

export function assertBracketSetupAllowed(tournament: TournamentDetail): void {
  const phase = getTournamentLivePhase(tournament);
  if (phase === "completed" || phase === "cancelled") {
    throw new AppError("Bracket cannot be modified after the tournament ends.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export function shouldExposeLivePublicData(tournament: TournamentDetail): boolean {
  return isLiveOrCompletedPhase(getTournamentLivePhase(tournament));
}

export function getPublicNotStartedPayload(tournament: TournamentDetail) {
  return {
    phase: "not_started" as const,
    message: TOURNAMENT_NOT_STARTED_MESSAGE,
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      sportSlug: tournament.sportSlug,
      status: tournament.status,
      tournamentType: tournament.tournamentType,
      officialBilling: tournament.officialBilling ?? null,
      format: tournament.format,
      venue: tournament.venue,
      categoryLabel: tournament.categoryLabel,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
    },
    players: [],
    bracket: { matches: [], leaderboard: [], generated: false },
    matches: [],
    matchHistory: [],
    leaderboard: [],
    playerStats: {
      totalPlayers: 0,
      activeTeams: 0,
      completedMatches: 0,
      inProgressMatches: 0,
      avgDurationSeconds: null,
      teams: [],
      players: [],
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}
