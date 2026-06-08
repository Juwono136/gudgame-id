import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Short-lived row so the verification email hook can include the generated
 * temporary password in the admin-invite template (same request window).
 */
export const adminInvitePending = pgTable("admin_invite_pending", {
  email: text("email").primaryKey(),
  temporaryPassword: text("temporary_password").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
