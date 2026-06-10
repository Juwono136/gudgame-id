import type { TournamentFormat } from "@/db/schema/tournaments";

export type SportTournamentDefaults = {
  playersPerTeam: number;
  maxTeams: number;
  defaultFormat: TournamentFormat;
  setLabel: string;
};

const DEFAULTS: SportTournamentDefaults = {
  playersPerTeam: 2,
  maxTeams: 32,
  defaultFormat: "single_elimination",
  setLabel: "sets",
};

const BY_SPORT: Record<string, Partial<SportTournamentDefaults>> = {
  padel: {
    playersPerTeam: 2,
    maxTeams: 32,
    defaultFormat: "single_elimination",
    setLabel: "sets (best of 3, golden point)",
  },
  tennis: {
    playersPerTeam: 1,
    maxTeams: 64,
    defaultFormat: "single_elimination",
    setLabel: "sets",
  },
  badminton: {
    playersPerTeam: 1,
    maxTeams: 64,
    defaultFormat: "single_elimination",
    setLabel: "games",
  },
};

export function getSportTournamentDefaults(sportSlug: string): SportTournamentDefaults {
  const override = BY_SPORT[sportSlug.toLowerCase()];
  return { ...DEFAULTS, ...override };
}
