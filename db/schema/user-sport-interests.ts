import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sports } from "./sports";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const userSportInterests = pgTable(
  "user_sport_interests",
  {
    id: uuidPrimaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sportId: uuidFk("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_sport_interests_user_sport_uidx").on(table.userId, table.sportId),
    index("user_sport_interests_user_idx").on(table.userId),
  ],
);

export type UserSportInterest = typeof userSportInterests.$inferSelect;
