import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { uuidPrimaryKey } from "./uuid";

export const SPORT_VISIBILITY = ["live", "coming_soon", "hidden"] as const;
export type SportVisibility = (typeof SPORT_VISIBILITY)[number];

export type SportModules = {
  tournaments: boolean;
  players: boolean;
  gear: boolean;
  rankings: boolean;
  rules: boolean;
};

export type SportTournamentConfig = {
  formats: ("americano" | "single_elimination")[];
  matchTypes: string[];
  scoringTypes: ("points" | "timed")[];
  pointsPerMatch: number[];
  courtCounts: number[];
  categories: ("Male" | "Female" | "Mix")[];
  defaultPlayersPerTeam: number;
};

/** Default tournament config for sports without explicit config */
export const DEFAULT_SPORT_TOURNAMENT_CONFIG: SportTournamentConfig = {
  formats: ["americano", "single_elimination"],
  matchTypes: ["Americano", "Elimination"],
  scoringTypes: ["points", "timed"],
  pointsPerMatch: [11, 15, 21, 25, 30],
  courtCounts: [1, 2, 3, 4, 5, 6, 8, 10, 12],
  categories: ["Male", "Female", "Mix"],
  defaultPlayersPerTeam: 2,
};

/** Key order matches PostgreSQL jsonb default normalization (drizzle-kit push diff). */
export const DEFAULT_SPORT_MODULES: SportModules = {
  gear: true,
  rules: true,
  players: true,
  rankings: true,
  tournaments: true,
};

export const sports = pgTable(
  "sports",
  {
    id: uuidPrimaryKey(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    slug: varchar("slug", { length: 50 }).notNull().unique(),
    tagline: varchar("tagline", { length: 160 }),
    description: text("description"),
    rulesSummary: text("rules_summary"),
    rulesContent: text("rules_content"),
    howToPlay: text("how_to_play"),
    equipmentOverview: text("equipment_overview"),
    heroImageUrl: text("hero_image_url"),
    heroImageStorageKey: varchar("hero_image_storage_key", { length: 512 }),
    entryCountLabel: varchar("entry_count_label", { length: 32 }),
    accentColor: varchar("accent_color", { length: 32 }),
    visibility: varchar("visibility", { length: 20 }).default("coming_soon").notNull(),
    modules: jsonb("modules").$type<SportModules>().default(DEFAULT_SPORT_MODULES).notNull(),
    tournamentConfig: jsonb("tournament_config").$type<SportTournamentConfig>(),
    isActive: boolean("is_active").default(true).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("sports_slug_idx").on(table.slug)],
);

export type Sport = typeof sports.$inferSelect;
export type NewSport = typeof sports.$inferInsert;
