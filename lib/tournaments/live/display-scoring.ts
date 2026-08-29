import type { MatchGameState } from "@/lib/tournaments/scoring/game-mode";
import type { TournamentLivePayload } from "@/lib/tournaments/live/types";

type LiveMatchLike = {
  gameState?: MatchGameState | null;
};

/**
 * Map live payload scoring → fullscreen / multi-court games display mode.
 * Returns undefined when the venue board should use flat points scoreboards.
 */
export function resolveGamesDisplayMode(
  scoring: TournamentLivePayload["scoring"] | undefined,
  match: LiveMatchLike | null | undefined,
):
  | {
      pointsA: number;
      pointsB: number;
      raceToGames: number;
      pointsToWinGame: number;
      lengthMode: "race_to" | "total";
      classicSets?: boolean;
      gameDecider?: "golden_point" | "star_point" | "advantage";
    }
  | undefined {
  if (!scoring || scoring.matchScoreMode !== "games") return undefined;
  const raceToGames = scoring.raceToGames;
  if (typeof raceToGames !== "number" || raceToGames < 1) return undefined;
  return {
    pointsA: match?.gameState?.currentPointsA ?? 0,
    pointsB: match?.gameState?.currentPointsB ?? 0,
    raceToGames,
    pointsToWinGame: scoring.pointsToWinGame ?? 40,
    lengthMode: scoring.lengthMode ?? "race_to",
    classicSets: scoring.classicSets === true,
    gameDecider: scoring.gameDecider ?? "golden_point",
  };
}
