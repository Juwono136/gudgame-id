/**
 * Create one super_admin user for first deploy (no email sent).
 *
 * GitHub Secrets (no quotes): BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD
 * Optional: BOOTSTRAP_ADMIN_NAME
 */
process.env.DB_SCRIPT_MODE = "true";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { closeDatabase, getDb } from "@/db/client";
import { account, user } from "@/db/schema/auth";
import { getUserRoleAssignments, setUserRoles } from "@/lib/roles/sync";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "bootstrap-admin-user" });

const DEFAULT_NAME = "Super Admin";
const BOOTSTRAP_ROLES = ["super_admin", "player"] as const;
const CREDENTIAL_PROVIDER_ID = "credential";

function normalizeEnvValue(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

function getBootstrapConfig(): { email: string; password: string; name: string } {
  const email = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_EMAIL).toLowerCase();
  const password = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_PASSWORD);
  const inCi = process.env.GITHUB_ACTIONS === "true";

  if (!email || !password) {
    const message =
      "[bootstrap-admin] BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required.";

    if (inCi) {
      console.error(message);
      process.exit(1);
    }

    console.warn(`${message} Skipping locally.`);
    process.exit(0);
  }

  if (password.length < 8) {
    console.error("[bootstrap-admin] BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const name = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_NAME) || DEFAULT_NAME;
  return { email, password, name };
}

async function syncCredentialPassword(userId: string, password: string): Promise<void> {
  const hashed = await hashPassword(password);
  const now = new Date();
  const db = getDb();

  const [existingCred] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)),
    )
    .limit(1);

  if (existingCred) {
    await db
      .update(account)
      .set({ password: hashed, updatedAt: now })
      .where(eq(account.id, existingCred.id));
    return;
  }

  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: CREDENTIAL_PROVIDER_ID,
    userId,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  });
}

async function markBootstrapUserReady(userId: string, name: string): Promise<void> {
  await getDb()
    .update(user)
    .set({
      name,
      fullNameKtp: name,
      emailVerified: true,
      isActive: true,
      mustChangePassword: false,
      invitedByAdmin: false,
      role: "super_admin",
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

async function createBootstrapUser(
  email: string,
  password: string,
  name: string,
): Promise<string> {
  const userId = randomUUID();
  const now = new Date();
  const hashed = await hashPassword(password);

  await getDb().insert(user).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    isActive: true,
    mustChangePassword: false,
    invitedByAdmin: false,
    fullNameKtp: name,
    role: "super_admin",
    createdAt: now,
    updatedAt: now,
  });

  await getDb().insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: CREDENTIAL_PROVIDER_ID,
    userId,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  });

  await setUserRoles(userId, [...BOOTSTRAP_ROLES]);
  return userId;
}

async function verifyBootstrapAdmin(userId: string, email: string): Promise<void> {
  const roles = await getUserRoleAssignments(userId);
  if (!roles.includes("super_admin")) {
    throw new Error(
      `Verification failed: ${email} missing super_admin (got: ${roles.join(", ") || "none"})`,
    );
  }
}

async function main(): Promise<void> {
  const { email, password, name } = getBootstrapConfig();

  console.log(`[bootstrap-admin] Ensuring super_admin for ${maskEmail(email)} (no email sent)`);

  const db = getDb();

  const [existing] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  let userId: string;

  if (existing) {
    userId = existing.id;
    await markBootstrapUserReady(userId, name);
    await syncCredentialPassword(userId, password);
    const existingRoles = await getUserRoleAssignments(userId);
    const mergedRoles = [...new Set([...existingRoles, ...BOOTSTRAP_ROLES])];
    await setUserRoles(userId, mergedRoles);
    console.log(
      `[bootstrap-admin] OK: ${existing.email} updated (roles: ${mergedRoles.join(", ")}, password synced)`,
    );
  } else {
    userId = await createBootstrapUser(email, password, name);
    console.log(`[bootstrap-admin] OK: ${email} created with super_admin role`);
  }

  await verifyBootstrapAdmin(userId, email);
  log.info("Bootstrap admin ready", { userId, email });

  await closeDatabase();
}

main().catch((err) => {
  log.error("Bootstrap admin failed", err);
  console.error("[bootstrap-admin] Failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
