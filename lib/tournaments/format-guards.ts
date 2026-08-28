import { formatHasGroupStage, resolveFormatEngine } from "@/lib/tournaments/match-config";
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
  const engine = resolveFormatEngine(tournament.format);
  if (
    engine === "group_only" ||
    engine === "americano" ||
    engine === "mexicano"
  ) {
    throw new AppError("This tournament format does not support knockout generation.", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}
