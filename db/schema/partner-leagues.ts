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
import { partners } from "./partners";
import { sports } from "./sports";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const PARTNER_LEAGUE_STATUSES = ["draft", "active", "completed", "archived"] as const;
export type PartnerLeagueStatus = (typeof PARTNER_LEAGUE_STATUSES)[number];

export const PARTNER_LEAGUE_MATCH_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type PartnerLeagueMatchStatus = (typeof PARTNER_LEAGUE_MATCH_STATUSES)[number];

/** Partner-only recurring league (manual scores, no TV / career sync). */
export const partnerLeagues = pgTable(
  "partner_leagues",
  {
    id: uuidPrimaryKey(),
    partnerId: uuidFk("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    sportId: uuidFk("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 100 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    settings: jsonb("settings").default({}).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("partner_leagues_partner_slug_uidx").on(table.partnerId, table.slug),
    index("partner_leagues_partner_idx").on(table.partnerId),
    index("partner_leagues_sport_idx").on(table.sportId),
    index("partner_leagues_status_idx").on(table.status),
  ],
);

export const partnerLeagueTeams = pgTable(
  "partner_league_teams",
  {
    id: uuidPrimaryKey(),
    leagueId: uuidFk("league_id")
      .notNull()
      .references(() => partnerLeagues.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("partner_league_teams_league_idx").on(table.leagueId),
    uniqueIndex("partner_league_teams_league_name_uidx").on(table.leagueId, table.name),
  ],
);

export const partnerLeagueMatches = pgTable(
  "partner_league_matches",
  {
    id: uuidPrimaryKey(),
    leagueId: uuidFk("league_id")
      .notNull()
      .references(() => partnerLeagues.id, { onDelete: "cascade" }),
    teamAId: uuidFk("team_a_id")
      .notNull()
      .references(() => partnerLeagueTeams.id, { onDelete: "restrict" }),
    teamBId: uuidFk("team_b_id")
      .notNull()
      .references(() => partnerLeagueTeams.id, { onDelete: "restrict" }),
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),
    status: varchar("status", { length: 20 }).default("scheduled").notNull(),
    playedAt: timestamp("played_at"),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("partner_league_matches_league_idx").on(table.leagueId),
    index("partner_league_matches_status_idx").on(table.status),
    index("partner_league_matches_played_at_idx").on(table.playedAt),
  ],
);

export type PartnerLeague = typeof partnerLeagues.$inferSelect;
export type NewPartnerLeague = typeof partnerLeagues.$inferInsert;
export type PartnerLeagueTeam = typeof partnerLeagueTeams.$inferSelect;
export type NewPartnerLeagueTeam = typeof partnerLeagueTeams.$inferInsert;
export type PartnerLeagueMatch = typeof partnerLeagueMatches.$inferSelect;
export type NewPartnerLeagueMatch = typeof partnerLeagueMatches.$inferInsert;
