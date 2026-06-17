import {
  boolean,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Up to 3 bank accounts per host; one marked primary for payouts */
export const hostBankAccounts = pgTable(
  "host_bank_accounts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bankCode: varchar("bank_code", { length: 20 }).notNull(),
    bankAccountNumber: varchar("bank_account_number", { length: 40 }).notNull(),
    bankAccountHolder: varchar("bank_account_holder", { length: 120 }).notNull(),
    label: varchar("label", { length: 60 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("host_bank_accounts_user_idx").on(table.userId)],
);

export type HostBankAccount = typeof hostBankAccounts.$inferSelect;
export type NewHostBankAccount = typeof hostBankAccounts.$inferInsert;
