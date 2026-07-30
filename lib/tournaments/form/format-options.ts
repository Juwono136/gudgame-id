import type { TournamentFormat } from "@/db/schema/tournaments";
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
    label: "Elimination",
    shortLabel: "Elimination",
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
      "Configurable pairs per pool and advancement (1st / 1st+2nd)",
      "Best runner-up slots to fill knockout brackets",
      "Automatic standings, seeding, and bracket generation",
    ],
  },
};

/** Formats enabled for a sport (defaults to both; extend via sport admin config later). */
export function getAllowedFormatsForSport(
  sportSlug: string,
  options?: { officialOnly?: boolean; partnerTenant?: boolean },
): TournamentFormat[] {
  const defaults = getSportTournamentDefaults(sportSlug);
  // Official + partner white-label both support group→knockout (double_stage).
  if (options?.officialOnly || options?.partnerTenant) {
    return ["double_stage", "single_elimination", "americano"];
  }
  if (defaults.defaultFormat === "americano") {
    return ["americano", "single_elimination"];
  }
  return ["single_elimination", "americano"];
}
