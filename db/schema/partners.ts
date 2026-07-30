import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { uuidFk, uuidPrimaryKey } from "./uuid";

export const PARTNER_MEMBER_ROLES = ["owner", "staff"] as const;
export type PartnerMemberRole = (typeof PARTNER_MEMBER_ROLES)[number];

/** White-label partner tenant (path-based: /{slug}). */
export const partners = pgTable(
  "partners",
  {
    id: uuidPrimaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    logoUrl: text("logo_url"),
    logoStorageKey: varchar("logo_storage_key", { length: 512 }),
    /** Theme tokens: primaryColor, accentColor, etc. */
    branding: jsonb("branding").default({}).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("partners_slug_uidx").on(table.slug),
    index("partners_active_idx").on(table.isActive),
  ],
);

/** Users who can manage a partner tenant. */
export const partnerMembers = pgTable(
  "partner_members",
  {
    id: uuidPrimaryKey(),
    partnerId: uuidFk("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).default("owner").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("partner_members_partner_user_uidx").on(table.partnerId, table.userId),
    index("partner_members_user_idx").on(table.userId),
  ],
);

export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
export type PartnerMember = typeof partnerMembers.$inferSelect;
export type NewPartnerMember = typeof partnerMembers.$inferInsert;
