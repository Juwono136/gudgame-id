import type { WikiEntityType } from "@/db/schema/wiki";

export const WIKI_ENTITY_TYPE_LABELS: Record<WikiEntityType, string> = {
  player: "Player",
  team: "Team",
  gear: "Gear / Tools",
};

export const WIKI_DIRECTORY_ENTITY_LABELS: Record<
  WikiEntityType | "tournament",
  string
> = {
  ...WIKI_ENTITY_TYPE_LABELS,
  tournament: "Tournament",
};

export const WIKI_DIRECTORY_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "player", label: "Players" },
  { value: "gear", label: "Gear" },
  { value: "tournament", label: "Tournaments" },
] as const;

export type WikiDirectoryTypeFilterValue =
  (typeof WIKI_DIRECTORY_TYPE_FILTER_OPTIONS)[number]["value"];

export const WIKI_ENTITY_TYPE_PLURAL: Record<WikiEntityType, string> = {
  player: "Players",
  team: "Teams",
  gear: "Gear & Tools",
};

export const WIKI_STATUS_LABELS = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
} as const;

export const WIKI_RELATION_TYPES = {
  team_member: "team_member",
  uses_gear: "uses_gear",
  sponsored_by: "sponsored_by",
  team_of: "team_of",
} as const;

export type WikiRelationType =
  (typeof WIKI_RELATION_TYPES)[keyof typeof WIKI_RELATION_TYPES];

/** Gallery limit for admin wiki wizard */
export const WIKI_GALLERY_MAX = 5;

/** Gallery limit for self-managed player profiles */
export const PLAYER_GALLERY_MAX = 4;

/** Default sport slug for new self-managed player profiles */
export const DEFAULT_PLAYER_SPORT_SLUG = "padel";

export function getPublicWikiPath(
  sportSlug: string,
  entityType: WikiEntityType,
  slug: string,
): string {
  const segment =
    entityType === "gear" ? "gear" : entityType === "team" ? "teams" : "players";
  return `/sports/${sportSlug}/${segment}/${slug}`;
}
