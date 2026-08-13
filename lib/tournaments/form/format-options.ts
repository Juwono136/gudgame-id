import type { TournamentFormat } from "@/db/schema/tournaments";
import {
  CUSTOM_FORMATS,
  ORIGINAL_FORMATS,
  type TournamentFormatFamily,
} from "@/lib/tournaments/match-config";
import { getSportTournamentDefaults } from "@/lib/tournaments/sport-config";

export type FormatOption = {
  value: TournamentFormat;
  label: string;
  shortLabel: string;
  description: string;
  bullets: string[];
};

export const FORMAT_OPTIONS: Partial<Record<TournamentFormat, FormatOption>> = {
  americano: {
    value: "americano",
    label: "Americano",
    shortLabel: "Americano",
    description:
      "Everyone plays multiple rounds with rotating partners and opponents. Points are tracked per player.",
    bullets: [
      "Partners and opponents change each round",
      "Fixed points or timed games per match",
      "Winner = highest total individual points",
    ],
  },
  single_elimination: {
    value: "single_elimination",
    label: "Knockout / Elimination",
    shortLabel: "Knockout",
    description:
      "Classic knockout bracket — winners advance, losers are out. Common for official events.",
    bullets: [
      "Fixed bracket pairings",
      "Win to advance, lose and you're out",
      "Clear path to a single champion",
    ],
  },
  double_stage: {
    value: "double_stage",
    label: "Group stage + knockout",
    shortLabel: "Double Stage",
    description:
      "Round-robin pools, then a knockout bracket for qualifiers — FIP-style field structure.",
    bullets: [
      "Configurable pairs per pool and advancement",
      "Best runner-up slots to fill knockout brackets",
      "Automatic standings, seeding, and bracket generation",
    ],
  },
  mexicano: {
    value: "mexicano",
    label: "Mexicano",
    shortLabel: "Mexicano",
    description:
      "Round-based play seeded from the live leaderboard. Round 1 is random; later rounds pair by rank.",
    bullets: [
      "Individual (rotating partners) or Team (fixed pairs)",
      "Configurable number of rounds",
      "Leaderboard decides the champion",
    ],
  },
  group_only: {
    value: "group_only",
    label: "Group only",
    shortLabel: "Group only",
    description:
      "Pure round-robin — every team meets every other team. Final standings decide the winner; no knockout.",
    bullets: [
      "All combinations generated automatically",
      "Standings update after every result",
      "No bracket or knockout stage",
    ],
  },
};

/** Formats enabled for a sport (defaults to both; extend via sport admin config later). */
export function getAllowedFormatsForSport(
  sportSlug: string,
  options?: {
    officialOnly?: boolean;
    partnerTenant?: boolean;
    formatFamily?: TournamentFormatFamily;
  },
): TournamentFormat[] {
  const defaults = getSportTournamentDefaults(sportSlug);
  if (options?.officialOnly || options?.partnerTenant) {
    if (options.formatFamily === "custom") {
      return [...CUSTOM_FORMATS];
    }
    if (options.formatFamily === "original") {
      return [...ORIGINAL_FORMATS];
    }
    // Legacy / unspecified: keep previous three + new formats for Official
    if (options.officialOnly && !options.partnerTenant) {
      return [...ORIGINAL_FORMATS];
    }
    return ["double_stage", "single_elimination", "americano"];
  }
  if (defaults.defaultFormat === "americano") {
    return ["americano", "single_elimination"];
  }
  return ["single_elimination", "americano"];
}
