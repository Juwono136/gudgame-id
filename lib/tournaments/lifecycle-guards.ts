import "server-only";

import { AppError } from "@/lib/errors";
import {
  isLiveOrCompletedPhase,
  resolveTournamentLivePhase,
  TOURNAMENT_NOT_STARTED_MESSAGE,
  type TournamentLivePhase,
} from "@/lib/tournaments/core/types";
import { buildDoubleStageOverview } from "@/lib/tournaments/double-stage/service";
import { getDoubleStagePhase } from "@/lib/tournaments/format-capabilities";
import { parseDoubleStageSettings } from "@/lib/tournaments/scoring/config";
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

/** Initial bracket creation — allowed while upcoming or live (before play starts). */
export function assertBracketInitialGenerationAllowed(tournament: TournamentDetail): void {
  assertBracketSetupAllowed(tournament);
}

export function assertBracketSeedingEditable(tournament: TournamentDetail): void {
  const phase = getTournamentLivePhase(tournament);
  if (phase === "completed" || phase === "cancelled") {
    throw new AppError("Bracket seeding cannot be changed after the tournament ends.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export function assertBracketSeedingResetAllowed(tournament: TournamentDetail): void {
  assertBracketSeedingEditable(tournament);
}

export function shouldExposeBracketPublicData(tournament: TournamentDetail): boolean {
  if (tournament.format === "americano" || tournament.format === "mexicano") return false;
  if (tournament.format === "group_only") return false;
  if (tournament.format === "double_stage") {
    return getDoubleStagePhase(tournament) === "knockout";
  }
  return true;
}

export function shouldExposeGroupStagePublicData(tournament: TournamentDetail): boolean {
  return tournament.format === "double_stage" || tournament.format === "group_only";
}

export function assertDoubleStageGroupScoringAllowed(tournament: TournamentDetail): void {
  assertTournamentLiveForScoring(tournament);
  if (tournament.format !== "double_stage" && tournament.format !== "group_only") {
    throw new AppError("Not a group-stage tournament", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }
  if (tournament.format === "group_only") return;
  const phase = getDoubleStagePhase(tournament);
  if (phase !== "group") {
    throw new AppError("Group stage scoring is only allowed during the group phase.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export async function assertDoubleStageAdvanceAllowed(
  tournament: TournamentDetail,
): Promise<void> {
  assertTournamentLiveForScoring(tournament);
  if (tournament.format === "group_only") {
    throw new AppError("Group-only tournaments do not have a knockout stage.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  if (tournament.format !== "double_stage") {
    throw new AppError("Not a double stage tournament", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }
  const ds = parseDoubleStageSettings(
    (tournament.settings as Record<string, unknown>)?.doubleStage,
  );
  if (ds.phase !== "group") {
    throw new AppError("Knockout bracket has already been generated.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  const overview = await buildDoubleStageOverview(tournament);
  if (!overview.allGroupMatchesCompleted) {
    throw new AppError("Complete all group stage matches before advancing to knockout.", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
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
