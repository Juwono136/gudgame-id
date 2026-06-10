import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const HOST_XENDIT_STATUSES = [
  "pending",
  "active",
  "suspended",
  "failed",
] as const;
export type HostXenditStatus = (typeof HOST_XENDIT_STATUSES)[number];

/** XenPlatform managed sub-account linked to a host user for direct payouts */
export const hostXenditAccounts = pgTable(
  "host_xendit_accounts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Xendit business / sub-account ID (for-user-id / split destination) */
    xenditAccountId: varchar("xendit_account_id", { length: 80 }).notNull(),
    accountEmail: varchar("account_email", { length: 200 }).notNull(),
    businessName: varchar("business_name", { length: 200 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("host_xendit_accounts_user_uidx").on(table.userId),
    uniqueIndex("host_xendit_accounts_xendit_uidx").on(table.xenditAccountId),
    index("host_xendit_accounts_status_idx").on(table.status),
  ],
);

export type HostXenditAccount = typeof hostXenditAccounts.$inferSelect;
