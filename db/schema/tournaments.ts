import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sports } from "./sports";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const TOURNAMENT_STATUSES = [
  "draft",
  "upcoming",
  "live",
  "completed",
  "cancelled",
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

/** official = paid/legal (stats count); recreational = free reclub (no ranking impact) */
export const TOURNAMENT_TYPES = ["official", "recreational"] as const;
export type TournamentType = (typeof TOURNAMENT_TYPES)[number];

export const TOURNAMENT_FORMATS = [
  "single_elimination",
  "double_elimination",
  "round_robin",
  "groups",
  "open_play",
] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuidPrimaryKey(),
    sportId: uuidFk("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    summary: text("summary"),
    description: text("description"),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    tournamentType: varchar("tournament_type", { length: 20 }).notNull(),
    rules: text("rules"),
    venue: varchar("venue", { length: 200 }),
    categoryLabel: varchar("category_label", { length: 80 }),
    format: varchar("format", { length: 40 }).default("single_elimination").notNull(),
    maxTeams: integer("max_teams"),
    playersPerTeam: integer("players_per_team").default(2).notNull(),
    registrationFeeIdr: integer("registration_fee_idr"),
    prizePoolIdr: integer("prize_pool_idr"),
    registrationOpensAt: timestamp("registration_opens_at"),
    registrationClosesAt: timestamp("registration_closes_at"),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    coverImageUrl: text("cover_image_url"),
    coverImageStorageKey: varchar("cover_image_storage_key", { length: 512 }),
    /** Bracket config, registration settings — extended by tournament module */
    settings: jsonb("settings").default({}).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("tournaments_sport_slug_uidx").on(table.sportId, table.slug),
    index("tournaments_sport_status_idx").on(table.sportId, table.status),
    index("tournaments_starts_at_idx").on(table.startsAt),
  ],
);

export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
