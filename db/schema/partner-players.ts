import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { partners } from "./partners";
import { sports } from "./sports";
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const PARTNER_REGISTRATION_STATUSES = [
  "awaiting_payment",
  "confirmed",
  "cancelled",
  "expired",
] as const;
export type PartnerRegistrationStatus = (typeof PARTNER_REGISTRATION_STATUSES)[number];

/**
 * Keep FK constraint names ≤ 63 chars (Postgres identifier limit).
 * Auto-generated long names get truncated and make `drizzle-kit push` loop forever.
 */

/** Guest/partner-scoped players — never Gud Game auth users. */
export const partnerPlayers = pgTable(
  "partner_players",
  {
    id: uuidPrimaryKey(),
    partnerId: uuidFk("partner_id").notNull(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "partner_players_partner_fk",
      columns: [table.partnerId],
      foreignColumns: [partners.id],
    }).onDelete("cascade"),
    uniqueIndex("partner_players_partner_email_uidx").on(table.partnerId, table.email),
    uniqueIndex("partner_players_partner_phone_uidx").on(table.partnerId, table.phone),
    index("partner_players_partner_idx").on(table.partnerId),
    index("partner_players_name_idx").on(table.fullName),
  ],
);

/** Guest tournament registration (no Gud Game login). */
export const partnerTournamentRegistrations = pgTable(
  "partner_tournament_registrations",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id").notNull(),
    partnerId: uuidFk("partner_id").notNull(),
    status: varchar("status", { length: 24 }).default("awaiting_payment").notNull(),
    teamName: varchar("team_name", { length: 120 }).notNull(),
    captainPartnerPlayerId: uuidFk("captain_partner_player_id"),
    teamId: uuidFk("team_id"),
    feeIdr: integer("fee_idr"),
    paymentDueAt: timestamp("payment_due_at"),
    /** Hashed access token for pay/success links */
    accessTokenHash: varchar("access_token_hash", { length: 128 }).notNull(),
    notes: text("notes"),
    confirmedAt: timestamp("confirmed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "ptr_tournament_fk",
      columns: [table.tournamentId],
      foreignColumns: [tournaments.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "ptr_partner_fk",
      columns: [table.partnerId],
      foreignColumns: [partners.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "ptr_captain_fk",
      columns: [table.captainPartnerPlayerId],
      foreignColumns: [partnerPlayers.id],
    }).onDelete("set null"),
    index("partner_tnmt_regs_tournament_idx").on(table.tournamentId),
    index("partner_tnmt_regs_partner_idx").on(table.partnerId),
    index("partner_tnmt_regs_status_idx").on(table.status),
    uniqueIndex("partner_tnmt_regs_token_uidx").on(table.accessTokenHash),
  ],
);

export const partnerTournamentRegistrationMembers = pgTable(
  "partner_tournament_registration_members",
  {
    id: uuidPrimaryKey(),
    registrationId: uuidFk("registration_id").notNull(),
    partnerPlayerId: uuidFk("partner_player_id"),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    roleOrder: integer("role_order").default(0).notNull(),
    isCaptain: boolean("is_captain").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "ptrm_registration_fk",
      columns: [table.registrationId],
      foreignColumns: [partnerTournamentRegistrations.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "ptrm_player_fk",
      columns: [table.partnerPlayerId],
      foreignColumns: [partnerPlayers.id],
    }).onDelete("set null"),
    index("partner_tnmt_reg_members_reg_idx").on(table.registrationId),
  ],
);

/** Partner-only match history (never Gud Game career). */
export const partnerPlayerMatches = pgTable(
  "partner_player_matches",
  {
    id: uuidPrimaryKey(),
    partnerPlayerId: uuidFk("partner_player_id").notNull(),
    partnerId: uuidFk("partner_id").notNull(),
    sportId: uuidFk("sport_id"),
    tournamentId: uuidFk("tournament_id"),
    tournamentName: varchar("tournament_name", { length: 200 }).notNull(),
    opponents: varchar("opponents", { length: 300 }).notNull(),
    resultType: varchar("result_type", { length: 10 }).notNull(),
    score: varchar("score", { length: 50 }),
    round: varchar("round", { length: 80 }),
    playedAt: timestamp("played_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "ppm_player_fk",
      columns: [table.partnerPlayerId],
      foreignColumns: [partnerPlayers.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "ppm_partner_fk",
      columns: [table.partnerId],
      foreignColumns: [partners.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "ppm_sport_fk",
      columns: [table.sportId],
      foreignColumns: [sports.id],
    }).onDelete("set null"),
    foreignKey({
      name: "ppm_tournament_fk",
      columns: [table.tournamentId],
      foreignColumns: [tournaments.id],
    }).onDelete("set null"),
    index("partner_player_matches_player_idx").on(table.partnerPlayerId),
    index("partner_player_matches_partner_idx").on(table.partnerId),
    index("partner_player_matches_tournament_idx").on(table.tournamentId),
  ],
);

export const partnerPlayerTournamentResults = pgTable(
  "partner_player_tournament_results",
  {
    id: uuidPrimaryKey(),
    partnerPlayerId: uuidFk("partner_player_id").notNull(),
    partnerId: uuidFk("partner_id").notNull(),
    sportId: uuidFk("sport_id"),
    tournamentId: uuidFk("tournament_id"),
    year: integer("year").notNull(),
    tournamentName: varchar("tournament_name", { length: 200 }).notNull(),
    category: varchar("category", { length: 80 }),
    placement: varchar("placement", { length: 80 }).notNull(),
    placementRank: integer("placement_rank"),
    playedAt: timestamp("played_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "pptr_player_fk",
      columns: [table.partnerPlayerId],
      foreignColumns: [partnerPlayers.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pptr_partner_fk",
      columns: [table.partnerId],
      foreignColumns: [partners.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pptr_sport_fk",
      columns: [table.sportId],
      foreignColumns: [sports.id],
    }).onDelete("set null"),
    foreignKey({
      name: "pptr_tournament_fk",
      columns: [table.tournamentId],
      foreignColumns: [tournaments.id],
    }).onDelete("set null"),
    index("partner_player_results_player_idx").on(table.partnerPlayerId),
    index("partner_player_results_partner_idx").on(table.partnerId),
    index("partner_player_results_year_idx").on(table.year),
  ],
);

export type PartnerPlayer = typeof partnerPlayers.$inferSelect;
export type NewPartnerPlayer = typeof partnerPlayers.$inferInsert;
export type PartnerTournamentRegistration =
  typeof partnerTournamentRegistrations.$inferSelect;
export type NewPartnerTournamentRegistration =
  typeof partnerTournamentRegistrations.$inferInsert;
export type PartnerTournamentRegistrationMember =
  typeof partnerTournamentRegistrationMembers.$inferSelect;
export type NewPartnerTournamentRegistrationMember =
  typeof partnerTournamentRegistrationMembers.$inferInsert;
