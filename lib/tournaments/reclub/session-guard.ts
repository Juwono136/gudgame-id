import "server-only";

import { AppError } from "@/lib/errors";
import {
  isFunMatchType,
  isOfficialType,
  supportsRoundBasedPlay,
} from "@/lib/tournaments/core/types";
import { assertTournamentLiveForScoring } from "@/lib/tournaments/lifecycle-guards";
import {
  canJoinReclubSession,
  canPlayReclubSession,
  computeReclubSessionPhase,
  getReclubSessionEndedMessage,
  getReclubSessionNotLiveMessage,
} from "@/lib/tournaments/reclub/session-lifecycle";
import type { TournamentDetail } from "@/lib/tournaments/service";

export function assertReclubTournament(tournament: TournamentDetail): void {
  if (!isFunMatchType(tournament.tournamentType)) {
    throw new AppError("This action is only available for Fun Match sessions", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }
}

export function assertRoundBasedTournament(tournament: TournamentDetail): void {
  if (!supportsRoundBasedPlay(tournament)) {
    throw new AppError("Round scoring is not available for this tournament format", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }
}

export function assertReclubSessionJoinable(tournament: TournamentDetail): void {
  assertReclubTournament(tournament);

  if (!canJoinReclubSession(tournament)) {
    const phase = computeReclubSessionPhase(tournament);
    throw new AppError(
      phase === "ended"
        ? getReclubSessionEndedMessage()
        : "This session is not open for joining right now.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }
}

export function assertReclubSessionPlayable(tournament: TournamentDetail): void {
  assertRoundBasedTournament(tournament);

  if (isOfficialType(tournament.tournamentType)) {
    assertTournamentLiveForScoring(tournament);
    return;
  }

  const phase = computeReclubSessionPhase(tournament);
  if (phase === "ended") {
    throw new AppError(getReclubSessionEndedMessage(), {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
  if (!canPlayReclubSession(tournament)) {
    throw new AppError(getReclubSessionNotLiveMessage(), {
      code: "VALIDATION_ERROR",
      statusCode: 403,
    });
  }
}
