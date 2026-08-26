import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { partners } from "./partners";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const PARTNER_IDENTITY_VERIFICATION_KINDS = [
  "email_verify",
  "password_reset",
] as const;
export type PartnerIdentityVerificationKind =
  (typeof PARTNER_IDENTITY_VERIFICATION_KINDS)[number];

/**
 * Partner-scoped player accounts — fully isolated from Gud Game `user`
 * and from other partners. Unique email is per partner only.
 */
export const partnerIdentities = pgTable(
  "partner_identities",
  {
    id: uuidPrimaryKey(),
    partnerId: uuidFk("partner_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    /** better-auth/crypto scrypt: `${saltHex}:${keyHex}` */
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    emailVerifiedAt: timestamp("email_verified_at"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "partner_identities_partner_fk",
      columns: [table.partnerId],
      foreignColumns: [partners.id],
    }).onDelete("cascade"),
    uniqueIndex("partner_identities_partner_email_uidx").on(
      table.partnerId,
      table.email,
    ),
    index("partner_identities_partner_idx").on(table.partnerId),
  ],
);

export const partnerIdentitySessions = pgTable(
  "partner_identity_sessions",
  {
    id: uuidPrimaryKey(),
    partnerId: uuidFk("partner_id").notNull(),
    identityId: uuidFk("identity_id").notNull(),
    /** SHA-256 hex of the opaque session token stored in the cookie */
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    userAgent: varchar("user_agent", { length: 512 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "partner_id_sessions_partner_fk",
      columns: [table.partnerId],
      foreignColumns: [partners.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "partner_id_sessions_identity_fk",
      columns: [table.identityId],
      foreignColumns: [partnerIdentities.id],
    }).onDelete("cascade"),
    uniqueIndex("partner_id_sessions_token_uidx").on(table.tokenHash),
    index("partner_id_sessions_identity_idx").on(table.identityId),
    index("partner_id_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const partnerIdentityVerifications = pgTable(
  "partner_identity_verifications",
  {
    id: uuidPrimaryKey(),
    partnerId: uuidFk("partner_id").notNull(),
    identityId: uuidFk("identity_id").notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    /** SHA-256 hex of the one-time token */
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "partner_id_verify_partner_fk",
      columns: [table.partnerId],
      foreignColumns: [partners.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "partner_id_verify_identity_fk",
      columns: [table.identityId],
      foreignColumns: [partnerIdentities.id],
    }).onDelete("cascade"),
    uniqueIndex("partner_id_verify_token_uidx").on(table.tokenHash),
    index("partner_id_verify_identity_idx").on(table.identityId, table.kind),
  ],
);

export type PartnerIdentity = typeof partnerIdentities.$inferSelect;
export type NewPartnerIdentity = typeof partnerIdentities.$inferInsert;
export type PartnerIdentitySession = typeof partnerIdentitySessions.$inferSelect;
export type PartnerIdentityVerification =
  typeof partnerIdentityVerifications.$inferSelect;
