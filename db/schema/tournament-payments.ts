import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { partnerTournamentRegistrations } from "./partner-players";
import { tournamentRegistrations } from "./tournament-registration";
import { tournaments } from "./tournaments";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "expired",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const tournamentPayments = pgTable(
  "tournament_payments",
  {
    id: uuidPrimaryKey(),
    tournamentId: uuidFk("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "restrict" }),
    /** Gud Game official registration (nullable when partner guest payment). */
    registrationId: uuidFk("registration_id"),
    /** Partner guest registration (nullable when Gud Game payment). */
    partnerRegistrationId: uuidFk("partner_registration_id"),
    payerUserId: text("payer_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    xenditInvoiceId: varchar("xendit_invoice_id", { length: 120 }),
    xenditExternalId: varchar("xendit_external_id", { length: 120 }),
    amountIdr: integer("amount_idr").notNull(),
    platformFeeIdr: integer("platform_fee_idr").notNull().default(0),
    hostPayoutIdr: integer("host_payout_idr").notNull().default(0),
    processingFeeIdr: integer("processing_fee_idr").notNull().default(0),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    invoiceUrl: text("invoice_url"),
    xenditSplitRuleId: varchar("xendit_split_rule_id", { length: 120 }),
    hostPayoutStatus: varchar("host_payout_status", { length: 20 })
      .default("pending")
      .notNull(),
    hostPayoutCompletedAt: timestamp("host_payout_completed_at"),
    paidAt: timestamp("paid_at"),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "tnmt_payments_reg_fk",
      columns: [table.registrationId],
      foreignColumns: [tournamentRegistrations.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "tnmt_payments_partner_reg_fk",
      columns: [table.partnerRegistrationId],
      foreignColumns: [partnerTournamentRegistrations.id],
    }).onDelete("restrict"),
    index("tournament_payments_tournament_idx").on(table.tournamentId),
    index("tournament_payments_registration_idx").on(table.registrationId),
    index("tournament_payments_partner_reg_idx").on(table.partnerRegistrationId),
    index("tournament_payments_xendit_invoice_idx").on(table.xenditInvoiceId),
    index("tournament_payments_payer_idx").on(table.payerUserId),
    check(
      "tournament_payments_reg_xor_partner",
      sql`(
        ("registration_id" IS NOT NULL AND "partner_registration_id" IS NULL)
        OR ("registration_id" IS NULL AND "partner_registration_id" IS NOT NULL)
      )`,
    ),
  ],
);

/** Platform-wide payment settings (admin configurable) */
export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
