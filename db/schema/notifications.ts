import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { uuidPrimaryKey } from "./uuid";

export const NOTIFICATION_TYPES = [
  "tournament_confirm_participation",
  "tournament_payment_reminder",
  "tournament_registration_confirmed",
  "tournament_host_player_paid",
  "tournament_host_player_confirmed",
  "tournament_host_payout_disbursed",
  "tournament_host_payout_failed",
  "tournament_payment_expired",
  "tournament_team_invite",
  "tournament_registration_cancelled",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuidPrimaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    actionUrl: text("action_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_unread_idx").on(table.userId, table.readAt),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
