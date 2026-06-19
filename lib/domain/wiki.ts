/** Client-safe wiki domain types and constants. */

export type WikiEntityId = string;
export type WikiEntityRelationId = string;
export type WikiEntityMediaId = string;

export {
  WIKI_ENTITY_TYPES,
  WIKI_ENTITY_STATUSES,
  WIKI_SOURCE_TYPES,
  type WikiEntityType,
  type WikiEntityStatus,
  type WikiSourceType,
  type WikiEntity,
  type NewWikiEntity,
} from "@/db/schema/wiki";
