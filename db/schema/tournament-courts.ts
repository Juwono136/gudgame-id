import { index, integer, pgTable, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const tournamentCourts = pgTable(
  "tournament_courts",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    courtNumber: integer("court_number").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tournament_courts_tournament_idx").on(table.tournamentId),
    uniqueIndex("tournament_courts_tournament_number_uidx").on(
      table.tournamentId,
      table.courtNumber,
    ),
  ],
);

export type TournamentCourt = typeof tournamentCourts.$inferSelect;
export type NewTournamentCourt = typeof tournamentCourts.$inferInsert;
