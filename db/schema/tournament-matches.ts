import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { tournamentCourts } from "./tournament-courts";
import { tournamentTeams } from "./tournament-registration";
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

/** Reclub / unofficial match round — brief summary only, no ranking impact */
export const tournamentReclubMatches = pgTable(
  "tournament_reclub_matches",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
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
    durationSeconds: integer("duration_seconds"),
    summary: varchar("summary", { length: 300 }),
    status: varchar("status", { length: 20 }).default("completed").notNull(),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
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
    index("tournament_reclub_matches_tournament_idx").on(table.tournamentId),
    index("tournament_reclub_matches_round_idx").on(table.tournamentId, table.roundNumber),
    index("tournament_reclub_matches_court_idx").on(table.tournamentId, table.courtId),
  ],
);

export const BRACKET_MATCH_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "bye",
] as const;
export type BracketMatchStatus = (typeof BRACKET_MATCH_STATUSES)[number];

/** Official tournament bracket match */
export const tournamentBracketMatches = pgTable(
  "tournament_bracket_matches",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    matchNumber: integer("match_number").notNull(),
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
    winnerTeamId: uuidFk("winner_team_id"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    nextMatchId: uuidFk("next_match_id"),
    scheduledAt: timestamp("scheduled_at"),
    completedAt: timestamp("completed_at"),
    recordedByUserId: text("recorded_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    courtId: uuidFk("court_id").references(() => tournamentCourts.id, {
      onDelete: "set null",
    }),
    timerEndsAt: timestamp("timer_ends_at"),
    playOrder: integer("play_order"),
    callStatus: varchar("call_status", { length: 20 }).default("queued"),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "tb_matches_winner_team_fk",
      columns: [table.winnerTeamId],
      foreignColumns: [tournamentTeams.id],
    }).onDelete("set null"),
    foreignKey({
      name: "tb_matches_next_match_fk",
      columns: [table.nextMatchId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    index("tournament_bracket_matches_tournament_idx").on(table.tournamentId),
    index("tournament_bracket_matches_round_idx").on(
      table.tournamentId,
      table.roundNumber,
      table.matchNumber,
    ),
    index("tournament_bracket_matches_court_idx").on(table.tournamentId, table.courtId),
    index("tournament_bracket_matches_play_order_idx").on(
      table.tournamentId,
      table.playOrder,
    ),
  ],
);
