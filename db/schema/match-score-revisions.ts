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
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const MATCH_SCORE_REVISION_KINDS = ["group", "bracket", "reclub"] as const;
export type MatchScoreRevisionKind = (typeof MATCH_SCORE_REVISION_KINDS)[number];

export const MATCH_SCORE_REVISION_ACTIONS = [
  "increment",
  "decrement",
  "set",
  "set_points",
  "next_game",
  "complete",
  "complete_override",
  "timer_extend",
  "timer_finalize",
] as const;
export type MatchScoreRevisionAction = (typeof MATCH_SCORE_REVISION_ACTIONS)[number];

/**
 * Durable audit trail for live scoring (including undos).
 * Complements JSONB scoreEvents which intentionally omit decrements for public point logs.
 */
export const matchScoreRevisions = pgTable(
  "match_score_revisions",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    matchKind: varchar("match_kind", { length: 20 }).notNull(),
    matchId: uuidFk("match_id").notNull(),
    seq: integer("seq").notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    scoreABefore: integer("score_a_before").notNull(),
    scoreBBefore: integer("score_b_before").notNull(),
    scoreAAfter: integer("score_a_after").notNull(),
    scoreBAfter: integer("score_b_after").notNull(),
    side: varchar("side", { length: 1 }),
    gameState: jsonb("game_state"),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorName: varchar("actor_name", { length: 120 }),
    reason: varchar("reason", { length: 240 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("match_score_revisions_match_seq_uidx").on(
      table.matchKind,
      table.matchId,
      table.seq,
    ),
    index("match_score_revisions_match_idx").on(table.matchKind, table.matchId),
    index("match_score_revisions_tournament_idx").on(table.tournamentId),
  ],
);

export type MatchScoreRevision = typeof matchScoreRevisions.$inferSelect;
export type NewMatchScoreRevision = typeof matchScoreRevisions.$inferInsert;
