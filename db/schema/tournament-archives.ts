import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sports } from "./sports";
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

/** Immutable snapshot when a tournament completes or is cancelled */
export const tournamentArchives = pgTable(
  "tournament_archives",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    statsTier: varchar("stats_tier", { length: 20 }).notNull(),
    sportId: uuidFk("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "restrict" }),
    snapshot: jsonb("snapshot").notNull(),
    archivedAt: timestamp("archived_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_archives_creator_idx").on(
      table.createdByUserId,
      table.archivedAt,
    ),
    index("tournament_archives_tournament_idx").on(table.tournamentId),
  ],
);

export type TournamentArchive = typeof tournamentArchives.$inferSelect;
