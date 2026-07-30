import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { partnerPlayers } from "./partner-players";
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const REGISTRATION_STATUSES = [
  "draft",
  "awaiting_confirmation",
  "pending_payment",
  "confirmed",
  "cancelled",
  "declined",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** Team / club within a tournament lobby */
export const tournamentTeams = pgTable(
  "tournament_teams",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    logoUrl: text("logo_url"),
    captainUserId: text("captain_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("tournament_teams_tournament_idx").on(table.tournamentId),
    uniqueIndex("tournament_teams_name_uidx").on(table.tournamentId, table.name),
  ],
);

/** Player assigned to a team slot (Gud Game user XOR partner guest player). */
export const tournamentTeamMembers = pgTable(
  "tournament_team_members",
  {
    id: uuidPrimaryKey(),
    teamId: uuidFk("team_id")
      .notNull()
      .references(() => tournamentTeams.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    partnerPlayerId: uuidFk("partner_player_id").references(() => partnerPlayers.id, {
      onDelete: "cascade",
    }),
    slotIndex: integer("slot_index").default(0).notNull(),
    role: varchar("role", { length: 20 }).default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_team_members_team_idx").on(table.teamId),
    uniqueIndex("tournament_team_members_user_team_uidx").on(table.teamId, table.userId),
    uniqueIndex("tournament_team_members_partner_player_team_uidx").on(
      table.teamId,
      table.partnerPlayerId,
    ),
    uniqueIndex("tournament_team_members_slot_uidx").on(table.teamId, table.slotIndex),
    index("tournament_team_members_partner_player_idx").on(table.partnerPlayerId),
    check(
      "tournament_team_members_user_xor_partner",
      sql`(
        ("user_id" IS NOT NULL AND "partner_player_id" IS NULL)
        OR ("user_id" IS NULL AND "partner_player_id" IS NOT NULL)
      )`,
    ),
  ],
);

/** Registration record — one per team for official, per player for reclub */
export const tournamentRegistrations = pgTable(
  "tournament_registrations",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    teamId: uuidFk("team_id").references(() => tournamentTeams.id, {
      onDelete: "set null",
    }),
    registeredByUserId: text("registered_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 }).default("draft").notNull(),
    /** When captain confirmed participation (before payment) */
    confirmedAt: timestamp("confirmed_at"),
    confirmedByUserId: text("confirmed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    declinedAt: timestamp("declined_at"),
    paymentDueAt: timestamp("payment_due_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("tournament_registrations_tournament_idx").on(table.tournamentId),
    index("tournament_registrations_user_idx").on(table.registeredByUserId),
  ],
);
