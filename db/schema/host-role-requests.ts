import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { uuidPrimaryKey } from "./uuid";

/**
 * User-initiated requests to gain the Host role.
 * Super admins approve/reject; only one pending request per user is allowed.
 */
export const hostRoleRequests = pgTable(
  "host_role_requests",
  {
    id: uuidPrimaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    /** Optional message from the requester (why they want Host access). */
    message: text("message").notNull().default(""),
    /** Required when status = rejected — shown to the user. */
    rejectionReason: text("rejection_reason"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("host_role_requests_user_idx").on(table.userId, table.createdAt),
    index("host_role_requests_status_idx").on(table.status, table.createdAt),
    uniqueIndex("host_role_requests_one_pending_uidx")
      .on(table.userId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export type HostRoleRequest = typeof hostRoleRequests.$inferSelect;
export type NewHostRoleRequest = typeof hostRoleRequests.$inferInsert;
