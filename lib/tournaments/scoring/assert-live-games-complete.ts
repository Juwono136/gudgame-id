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
  type TournamentGameRulesContext,
  type TournamentRaceStage,
} from "@/lib/tournaments/settings";

/**
 * Server-side gate for Official live (non-paper) games / classic finalize.
 * Keeps group + knockout consistent and avoids trusting the client alone.
 * Callers are already server modules; omit `server-only` so unit tests can import.
 *
 * Pass `context` for knockout matches so Bestie Cup SF/Final (win-by-2 / TB at 6–6)
 * is enforced — without it, late rounds incorrectly use early-KO first-to-N rules.
 */
export function assertOfficialLiveGamesMatchComplete(
  tournament: TournamentDetail,
  stage: TournamentRaceStage,
  scores: { scoreA: number; scoreB: number },
  context?: TournamentGameRulesContext,
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

  const gameRules = getTournamentGameRules(tournament, stage, context);
  const result = isRaceToGamesMatchComplete(
    scores.scoreA,
    scores.scoreB,
    gameRules,
  );
  if (!result.complete) {
    const margin = gameRules.matchWinMargin ?? 1;
    const tbAt = gameRules.matchTiebreakAt;
    let hint: string;
    if ((gameRules.lengthMode ?? "race_to") === "total") {
      hint = `all ${gameRules.raceToGames} games must be played (most games won wins)`;
    } else if (margin > 1 && tbAt != null) {
      hint = `first to ${gameRules.raceToGames} with a ${margin}-game lead (tiebreak at ${tbAt}–${tbAt})`;
    } else if (tbAt != null) {
      hint = `first to ${gameRules.raceToGames} games (match tiebreak at ${tbAt}–${tbAt})`;
    } else {
      hint = `first team to ${gameRules.raceToGames} games wins`;
    }
    throw new AppError(`Match is not complete — ${hint}.`, {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
}
