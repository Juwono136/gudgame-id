import {
  foreignKey,
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
import { tournamentPayments } from "./tournament-payments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const HOST_PAYOUT_DISBURSEMENT_STATUSES = [
  "pending",
  "accepted",
  "requested",
  "succeeded",
  "failed",
  "cancelled",
  "reversed",
] as const;
export type HostPayoutDisbursementStatus =
  (typeof HOST_PAYOUT_DISBURSEMENT_STATUSES)[number];

/** Batch transfer from XenPlatform sub-account balance to host primary bank */
export const hostPayoutDisbursements = pgTable(
  "host_payout_disbursements",
  {
    id: uuidPrimaryKey(),
    hostUserId: text("host_user_id").notNull(),
    referenceId: varchar("reference_id", { length: 120 }).notNull(),
    xenditPayoutId: varchar("xendit_payout_id", { length: 120 }),
    amountIdr: integer("amount_idr").notNull(),
    paymentCount: integer("payment_count").notNull().default(0),
    payoutSchedule: varchar("payout_schedule", { length: 20 }).notNull(),
    bankCode: varchar("bank_code", { length: 20 }).notNull(),
    maskedAccount: varchar("masked_account", { length: 40 }).notNull(),
    bankAccountHolder: varchar("bank_account_holder", { length: 120 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    failureCode: varchar("failure_code", { length: 80 }),
    failureReason: text("failure_reason"),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    estimatedArrivalAt: timestamp("estimated_arrival_at"),
    completedAt: timestamp("completed_at"),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "host_payout_disbursements_host_user_id_user_id_fk",
      columns: [table.hostUserId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    uniqueIndex("host_payout_disbursements_reference_uidx").on(table.referenceId),
    index("host_payout_disbursements_host_created_idx").on(
      table.hostUserId,
      table.createdAt,
    ),
    index("host_payout_disbursements_status_idx").on(table.status),
    index("host_payout_disbursements_xendit_idx").on(table.xenditPayoutId),
  ],
);

export const hostPayoutDisbursementItems = pgTable(
  "host_payout_disbursement_items",
  {
    id: uuidPrimaryKey(),
    disbursementId: uuidFk("disbursement_id").notNull(),
    tournamentPaymentId: uuidFk("tournament_payment_id").notNull(),
    amountIdr: integer("amount_idr").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "host_payout_disb_items_disbursement_fk",
      columns: [table.disbursementId],
      foreignColumns: [hostPayoutDisbursements.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "host_payout_disb_items_payment_fk",
      columns: [table.tournamentPaymentId],
      foreignColumns: [tournamentPayments.id],
    }).onDelete("restrict"),
    uniqueIndex("host_payout_disbursement_items_payment_uidx").on(
      table.tournamentPaymentId,
    ),
    index("host_payout_disbursement_items_disbursement_idx").on(table.disbursementId),
  ],
);

export type HostPayoutDisbursement = typeof hostPayoutDisbursements.$inferSelect;
export type HostPayoutDisbursementItem = typeof hostPayoutDisbursementItems.$inferSelect;
