import { formatHasGroupStage } from "@/lib/tournaments/match-config";
import { AppError } from "@/lib/errors";
import type { TournamentDetail } from "@/lib/tournaments/service";

export function assertGroupStageTournament(tournament: TournamentDetail): void {
  if (!formatHasGroupStage(tournament.format)) {
    throw new AppError("Not a group-stage tournament", {
      code: "INVALID_TOURNAMENT_TYPE",
      statusCode: 400,
    });
  }
}

export function assertCanGenerateKnockout(tournament: TournamentDetail): void {
  if (
    tournament.format === "group_only" ||
    tournament.format === "americano" ||
    tournament.format === "mexicano"
  ) {
    throw new AppError("This tournament format does not support knockout generation.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}
