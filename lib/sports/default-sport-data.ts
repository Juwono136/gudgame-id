import type { SportVisibility } from "@/db/schema/sports";

export type DefaultSportSeed = {
  name: string;
  slug: string;
  visibility: SportVisibility;
  tagline: string;
  description: string;
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
  },
] as const;

export const DEFAULT_SPORT_SLUG = DEFAULT_SPORT_SEEDS[0]!.slug;
