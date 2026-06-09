import type { WikiEntityType } from "@/db/schema/wiki";

export const CREATE_ENTITY_KINDS = ["player", "gear", "tournament"] as const;
export type CreateEntityKind = (typeof CREATE_ENTITY_KINDS)[number];

export const CREATE_ENTITY_KIND_LABELS: Record<CreateEntityKind, string> = {
  player: "Player",
  gear: "Gear / Tools",
  tournament: "Tournament",
};

export function createKindToWikiEntityType(kind: CreateEntityKind): WikiEntityType | null {
  if (kind === "tournament") return null;
  return kind;
}
