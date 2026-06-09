import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sports } from "./sports";
import { wikiEntities } from "./wiki";

export const MATCH_RESULT_TYPES = ["win", "loss"] as const;
export type MatchResultType = (typeof MATCH_RESULT_TYPES)[number];

/** Recorded match results for a player (populated by the tournament module). */
export const playerMatches = pgTable(
  "player_matches",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wikiEntityId: integer("wiki_entity_id").references(() => wikiEntities.id, {
      onDelete: "set null",
    }),
    sportId: integer("sport_id").references(() => sports.id, { onDelete: "set null" }),
    tournamentName: varchar("tournament_name", { length: 200 }).notNull(),
    opponents: varchar("opponents", { length: 300 }).notNull(),
    resultType: varchar("result_type", { length: 10 }).notNull(),
    score: varchar("score", { length: 50 }),
    round: varchar("round", { length: 80 }),
    playedAt: timestamp("played_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("player_matches_user_idx").on(table.userId),
    index("player_matches_played_at_idx").on(table.playedAt),
    index("player_matches_tournament_idx").on(table.tournamentName),
  ],
);

/** Tournament placements for a player (populated by the tournament module). */
export const playerTournamentResults = pgTable(
  "player_tournament_results",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wikiEntityId: integer("wiki_entity_id").references(() => wikiEntities.id, {
      onDelete: "set null",
    }),
    sportId: integer("sport_id").references(() => sports.id, { onDelete: "set null" }),
    year: integer("year").notNull(),
    tournamentName: varchar("tournament_name", { length: 200 }).notNull(),
    category: varchar("category", { length: 80 }),
    placement: varchar("placement", { length: 80 }).notNull(),
    placementRank: integer("placement_rank"),
    playedAt: timestamp("played_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("player_tournament_results_user_idx").on(table.userId),
    index("player_tournament_results_year_idx").on(table.year),
    index("player_tournament_results_tournament_idx").on(table.tournamentName),
  ],
);
