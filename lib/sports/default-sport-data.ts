import type { SportTournamentConfig, SportVisibility } from "@/db/schema/sports";
import { DEFAULT_SPORT_TOURNAMENT_CONFIG } from "@/db/schema/sports";

export type DefaultSportSeed = {
  name: string;
  slug: string;
  visibility: SportVisibility;
  tagline: string;
  description: string;
  tournamentConfig?: SportTournamentConfig;
};

/** Padel-specific tournament defaults (extends global defaults). */
export const PADEL_TOURNAMENT_CONFIG: SportTournamentConfig = {
  ...DEFAULT_SPORT_TOURNAMENT_CONFIG,
  matchTypes: ["Americano", "Single elimination"],
  defaultPlayersPerTeam: 2,
};

/** MVP sport seeded on first run and auto-provisioned when missing. */
export const DEFAULT_SPORT_SEEDS: readonly DefaultSportSeed[] = [
  {
    name: "Padel",
    slug: "padel",
    visibility: "live",
    tagline: "Premier Padel, WPT & community coverage",
    description:
      "Comprehensive coverage of Premier Padel, WPT, player profiles, and technical gear reviews.",
    tournamentConfig: PADEL_TOURNAMENT_CONFIG,
  },
] as const;

export const DEFAULT_SPORT_SLUG = DEFAULT_SPORT_SEEDS[0]!.slug;
