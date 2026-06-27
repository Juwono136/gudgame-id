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
};

/** Formats enabled for a sport (defaults to both; extend via sport admin config later). */
export function getAllowedFormatsForSport(sportSlug: string): TournamentFormat[] {
  const defaults = getSportTournamentDefaults(sportSlug);
  if (defaults.defaultFormat === "americano") {
    return ["americano", "single_elimination"];
  }
  return ["single_elimination", "americano"];
}
