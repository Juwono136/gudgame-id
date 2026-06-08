import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sports } from "./sports";

export const WIKI_ENTITY_TYPES = ["player", "team", "gear"] as const;
export type WikiEntityType = (typeof WIKI_ENTITY_TYPES)[number];

export const WIKI_ENTITY_STATUSES = ["draft", "published", "archived"] as const;
export type WikiEntityStatus = (typeof WIKI_ENTITY_STATUSES)[number];

export const WIKI_SOURCE_TYPES = ["manual", "scraped"] as const;
export type WikiSourceType = (typeof WIKI_SOURCE_TYPES)[number];

/** Core wiki entry — player, team, or gear scoped to a sport */
export const wikiEntities = pgTable(
  "wiki_entities",
  {
    id: serial("id").primaryKey(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    entityType: varchar("entity_type", { length: 20 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    nickname: varchar("nickname", { length: 120 }),
    summary: text("summary"),
    biography: text("biography"),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    heroImageUrl: text("hero_image_url"),
    heroImageStorageKey: varchar("hero_image_storage_key", { length: 512 }),
    primaryImageUrl: text("primary_image_url"),
    primaryImageStorageKey: varchar("primary_image_storage_key", { length: 512 }),
    /** Sport-specific custom fields (nationality, tier, club, etc.) */
    attributes: jsonb("attributes").default({}).notNull(),
    /** Ratings / stats bars (power, control, win rate, etc.) */
    performance: jsonb("performance").default({}).notNull(),
    /** Technical specs — especially gear (shape, weight, balance) */
    specs: jsonb("specs").default({}).notNull(),
    /** Feature highlights / technologies */
    features: jsonb("features").default([]).notNull(),
    sourceType: varchar("source_type", { length: 20 }).default("manual").notNull(),
    sourceUrl: text("source_url"),
    scrapedAt: timestamp("scraped_at"),
    publishedAt: timestamp("published_at"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("wiki_entities_sport_slug_uidx").on(table.sportId, table.slug),
    index("wiki_entities_sport_type_idx").on(table.sportId, table.entityType),
    index("wiki_entities_status_idx").on(table.status),
    index("wiki_entities_display_name_idx").on(table.displayName),
  ],
);

export const wikiEntityRelations = pgTable(
  "wiki_entity_relations",
  {
    id: serial("id").primaryKey(),
    fromEntityId: integer("from_entity_id")
      .notNull()
      .references(() => wikiEntities.id, { onDelete: "cascade" }),
    toEntityId: integer("to_entity_id")
      .notNull()
      .references(() => wikiEntities.id, { onDelete: "cascade" }),
    relationType: varchar("relation_type", { length: 40 }).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("wiki_rel_from_idx").on(table.fromEntityId),
    index("wiki_rel_to_idx").on(table.toEntityId),
    uniqueIndex("wiki_rel_unique_uidx").on(
      table.fromEntityId,
      table.toEntityId,
      table.relationType,
    ),
  ],
);

export const wikiEntityMedia = pgTable(
  "wiki_entity_media",
  {
    id: serial("id").primaryKey(),
    entityId: integer("entity_id")
      .notNull()
      .references(() => wikiEntities.id, { onDelete: "cascade" }),
    url: text("url"),
    storageKey: varchar("storage_key", { length: 512 }),
    caption: varchar("caption", { length: 200 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    mediaType: varchar("media_type", { length: 20 }).default("image").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("wiki_media_entity_idx").on(table.entityId)],
);

export type WikiEntity = typeof wikiEntities.$inferSelect;
export type NewWikiEntity = typeof wikiEntities.$inferInsert;
export type WikiEntityRelation = typeof wikiEntityRelations.$inferSelect;
export type WikiEntityMedia = typeof wikiEntityMedia.$inferSelect;
