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
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { partnerLeagues } from "./partner-leagues";
import { sports } from "./sports";
import { partners } from "./partners";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const TOURNAMENT_STATUSES = [
  "draft",
  "upcoming",
  "live",
  "completed",
  "cancelled",
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

/** official = ranked tournaments; fun_match = free community play (formerly recreational/reclub) */
export const TOURNAMENT_TYPES = ["official", "fun_match"] as const;
export type TournamentType = (typeof TOURNAMENT_TYPES)[number];

/** @deprecated DB value migrated to fun_match — kept for API/UI backward compatibility */
export const LEGACY_TOURNAMENT_TYPE_RECREATIONAL = "recreational" as const;
export type LegacyTournamentType = typeof LEGACY_TOURNAMENT_TYPE_RECREATIONAL;

/** All tournament type values accepted in API/DB reads */
export type TournamentTypeInput = TournamentType | LegacyTournamentType;

export const OFFICIAL_BILLING_TYPES = ["paid", "free"] as const;
export type OfficialBillingType = (typeof OFFICIAL_BILLING_TYPES)[number];

export const TOURNAMENT_CATEGORIES = ["Male", "Female", "Mix"] as const;
export type TournamentCategory = (typeof TOURNAMENT_CATEGORIES)[number];

export const TOURNAMENT_FORMATS = [
  "americano",
  "single_elimination",
  "double_stage",
  "mexicano",
  "group_only",
  "swiss",
  "modified_swiss",
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
    /** paid | free for official tournaments; null for fun_match */
    officialBilling: varchar("official_billing", { length: 10 }),
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
    /** NULL = Gud Game; set = white-label partner tenant only */
    partnerId: uuidFk("partner_id").references(() => partners.id, {
      onDelete: "cascade",
    }),
    /**
     * Optional partner league grouping (brand / season). Partner tournaments only.
     * Cleared if the league is deleted.
     */
    partnerLeagueId: uuidFk("partner_league_id").references(() => partnerLeagues.id, {
      onDelete: "set null",
    }),
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
    index("tournaments_sport_status_idx").on(table.sportId, table.status),
    index("tournaments_starts_at_idx").on(table.startsAt),
    index("tournaments_partner_idx").on(table.partnerId),
    index("tournaments_partner_league_idx").on(table.partnerLeagueId),
    index("tournaments_sport_type_billing_status_idx").on(
      table.sportId,
      table.tournamentType,
      table.officialBilling,
      table.status,
    ),
    // Partial uniques from 0014 — must stay in schema or db:push tries to DROP them every run
    uniqueIndex("tournaments_gud_sport_slug_uidx")
      .on(table.sportId, table.slug)
      .where(sql`${table.partnerId} is null`),
    uniqueIndex("tournaments_partner_sport_slug_uidx")
      .on(table.partnerId, table.sportId, table.slug)
      .where(sql`${table.partnerId} is not null`),
  ],
);

export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
