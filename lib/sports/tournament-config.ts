import type { Sport, SportTournamentConfig } from "@/db/schema/sports";
import { DEFAULT_SPORT_TOURNAMENT_CONFIG } from "@/db/schema/sports";

export function resolveSportTournamentConfig(
  sport: Pick<Sport, "tournamentConfig"> | null | undefined,
): SportTournamentConfig {
  return sport?.tournamentConfig ?? DEFAULT_SPORT_TOURNAMENT_CONFIG;
}

export function getFormatLabel(format: string): string {
  return format === "americano" ? "Americano" : "Elimination";
}
