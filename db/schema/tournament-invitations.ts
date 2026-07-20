import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { tournamentTeams } from "./tournament-registration";
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const ACCESS_GRANT_ROLES = ["scorekeeper", "bracket_manager"] as const;
export type AccessGrantRole = (typeof ACCESS_GRANT_ROLES)[number];

export const INVITE_STATUSES = ["pending", "accepted", "revoked", "expired"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

/** Delegated bracket/scoring access for any tournament type */
export const tournamentAccessGrants = pgTable(
  "tournament_access_grants",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    email: varchar("email", { length: 255 }),
    role: varchar("role", { length: 32 }).notNull(),
    inviteCodeHash: varchar("invite_code_hash", { length: 128 }).notNull(),
    /** Plaintext code for host view-details only; never rotated after create. */
    inviteCode: varchar("invite_code", { length: 16 }),
    inviteToken: varchar("invite_token", { length: 64 }).notNull().unique(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_access_grants_tournament_idx").on(table.tournamentId),
    index("tournament_access_grants_user_idx").on(table.tournamentId, table.userId),
    uniqueIndex("tournament_access_grants_code_hash_uidx").on(
      table.tournamentId,
      table.inviteCodeHash,
    ),
  ],
);

/** Player invites for Fun Match tournaments */
export const tournamentPlayerInvites = pgTable(
  "tournament_player_invites",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    teamId: uuidFk("team_id").references(() => tournamentTeams.id, {
      onDelete: "set null",
    }),
    inviteCodeHash: varchar("invite_code_hash", { length: 128 }).notNull(),
    /** Plaintext code for host view-details only; never rotated after create. */
    inviteCode: varchar("invite_code", { length: 16 }),
    inviteToken: varchar("invite_token", { length: 64 }).notNull().unique(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    redeemedByUserId: text("redeemed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    redeemedAt: timestamp("redeemed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_player_invites_tournament_idx").on(table.tournamentId),
    uniqueIndex("tournament_player_invites_code_hash_uidx").on(
      table.tournamentId,
      table.inviteCodeHash,
    ),
  ],
);

export type TournamentAccessGrant = typeof tournamentAccessGrants.$inferSelect;
export type TournamentPlayerInvite = typeof tournamentPlayerInvites.$inferSelect;
