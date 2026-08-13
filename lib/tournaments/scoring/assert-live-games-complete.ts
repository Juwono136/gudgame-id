import { AppError } from "@/lib/errors";
import { isClassicMatchComplete } from "@/lib/tournaments/scoring/classic-sets";
import { isRaceToGamesMatchComplete } from "@/lib/tournaments/scoring/game-mode";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  getTournamentClassicSetRules,
  getTournamentGameRules,
  getTournamentMatchScoreMode,
  getTournamentScoreEntryMode,
  isClassicSetsFormat,
  type TournamentRaceStage,
} from "@/lib/tournaments/settings";

/**
 * Server-side gate for Official live (non-paper) games / classic finalize.
 * Keeps group + knockout consistent and avoids trusting the client alone.
 * Callers are already server modules; omit `server-only` so unit tests can import.
 */
export function assertOfficialLiveGamesMatchComplete(
  tournament: TournamentDetail,
  stage: TournamentRaceStage,
  scores: { scoreA: number; scoreB: number },
): void {
  if (getTournamentMatchScoreMode(tournament, stage) !== "games") return;
  if (getTournamentScoreEntryMode(tournament) === "paper") return;

  if (isClassicSetsFormat(tournament, stage)) {
    const setRules = getTournamentClassicSetRules(tournament, stage);
    const classic = isClassicMatchComplete(scores.scoreA, scores.scoreB, setRules);
    if (!classic.complete) {
      const need = Math.ceil(setRules.bestOfSets / 2);
      throw new AppError(
        `Match is not complete — first to ${need} sets wins (best of ${setRules.bestOfSets}).`,
        { code: "VALIDATION_ERROR", statusCode: 422 },
      );
    }
    return;
  }

  const gameRules = getTournamentGameRules(tournament, stage);
  const result = isRaceToGamesMatchComplete(
    scores.scoreA,
    scores.scoreB,
    gameRules,
  );
  if (!result.complete) {
    const hint =
      (gameRules.lengthMode ?? "race_to") === "total"
        ? `all ${gameRules.raceToGames} games must be played (most games won wins)`
        : `first team to ${gameRules.raceToGames} games wins`;
    throw new AppError(`Match is not complete — ${hint}.`, {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
}
