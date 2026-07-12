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
import { tournamentCourts } from "./tournament-courts";
import { tournamentTeams } from "./tournament-registration";
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const GROUP_QUALIFICATION_STATUSES = [
  "pending",
  "qualified",
  "eliminated",
] as const;
export type GroupQualificationStatus = (typeof GROUP_QUALIFICATION_STATUSES)[number];

export const GROUP_MATCH_STATUSES = [
  "pending",
  "in_progress",
  "completed",
] as const;
export type GroupMatchStatus = (typeof GROUP_MATCH_STATUSES)[number];

/** Group within a double-stage tournament */
export const tournamentGroups = pgTable(
  "tournament_groups",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_groups_tournament_idx").on(table.tournamentId),
    uniqueIndex("tournament_groups_name_uidx").on(table.tournamentId, table.name),
  ],
);

/** Team assigned to a group */
export const tournamentGroupTeams = pgTable(
  "tournament_group_teams",
  {
    id: uuidPrimaryKey(),
    groupId: uuidFk("group_id")
      .notNull()
      .references(() => tournamentGroups.id, { onDelete: "cascade" }),
    teamId: uuidFk("team_id")
      .notNull()
      .references(() => tournamentTeams.id, { onDelete: "cascade" }),
    qualificationStatus: varchar("qualification_status", { length: 20 })
      .default("pending")
      .notNull(),
    groupRank: integer("group_rank"),
    globalSeed: integer("global_seed"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_group_teams_group_idx").on(table.groupId),
    uniqueIndex("tournament_group_teams_team_uidx").on(table.groupId, table.teamId),
    uniqueIndex("tournament_group_teams_team_tournament_uidx").on(table.teamId),
  ],
);

/** Round-robin match within a group */
export const tournamentGroupMatches = pgTable(
  "tournament_group_matches",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    groupId: uuidFk("group_id")
      .notNull()
      .references(() => tournamentGroups.id, { onDelete: "cascade" }),
    matchNumber: integer("match_number").default(1).notNull(),
    teamAId: uuidFk("team_a_id").references(() => tournamentTeams.id, {
      onDelete: "set null",
    }),
    teamBId: uuidFk("team_b_id").references(() => tournamentTeams.id, {
      onDelete: "set null",
    }),
    teamAName: varchar("team_a_name", { length: 120 }),
    teamBName: varchar("team_b_name", { length: 120 }),
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),
    winnerTeamId: uuidFk("winner_team_id").references(() => tournamentTeams.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    scheduledAt: timestamp("scheduled_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationSeconds: integer("duration_seconds"),
    recordedByUserId: text("recorded_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    courtId: uuidFk("court_id").references(() => tournamentCourts.id, {
      onDelete: "set null",
    }),
    timerEndsAt: timestamp("timer_ends_at"),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_group_matches_tournament_idx").on(table.tournamentId),
    index("tournament_group_matches_group_idx").on(table.groupId),
    index("tournament_group_matches_court_idx").on(table.tournamentId, table.courtId),
  ],
);
