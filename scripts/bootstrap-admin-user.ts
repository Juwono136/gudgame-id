/**
 * Idempotent bootstrap: ensure a super_admin account exists (CI / first deploy).
 *
 * GitHub Secrets (no quotes in the UI):
 *   BOOTSTRAP_ADMIN_EMAIL
 *   BOOTSTRAP_ADMIN_PASSWORD  (min 8 chars)
 *   BOOTSTRAP_ADMIN_NAME      (optional)
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { closeDatabase, getDb } from "@/db/client";
import { account, user } from "@/db/schema/auth";
import { getBootstrapAuth } from "@/lib/auth/bootstrap-auth";
import { authRoutes } from "@/lib/constants/routes";
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
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function getBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function getBootstrapConfig(): { email: string; password: string; name: string } {
  const email = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_EMAIL).toLowerCase();
  const password = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_PASSWORD);
  const inCi = process.env.GITHUB_ACTIONS === "true";

  if (!email || !password) {
    const message =
      "[bootstrap-admin] BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be set " +
      "(GitHub Secrets → workflow env → docker-compose db-migrate environment).";

    if (inCi) {
      console.error(message);
      console.error(
        `[bootstrap-admin] CI check: hasEmail=${Boolean(email)} hasPassword=${Boolean(password)}`,
      );
      process.exit(1);
    }

    console.warn(`${message} Skipping locally.`);
    log.warn("Bootstrap admin skipped — missing email or password env");
    process.exit(0);
  }

  if (password.length < 8) {
    console.error(
      "[bootstrap-admin] BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.",
    );
    process.exit(1);
  }

  const name = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_NAME) || DEFAULT_NAME;
  return { email, password, name };
}

async function ensureSuperAdminRoles(userId: string): Promise<void> {
  await setUserRoles(userId, [...BOOTSTRAP_ROLES]);
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
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

async function syncBootstrapPassword(userId: string, password: string): Promise<void> {
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

async function verifyBootstrapAdmin(userId: string, email: string): Promise<void> {
  const roles = await getUserRoleAssignments(userId);
  if (!roles.includes("super_admin")) {
    throw new Error(
      `Verification failed: ${email} does not have super_admin (roles: ${roles.join(", ") || "none"})`,
    );
  }

  const [row] = await getDb()
    .select({
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row?.emailVerified || !row.isActive) {
    throw new Error(`Verification failed: ${email} is not active or email not verified`);
  }
}

async function createBootstrapUser(
  email: string,
  password: string,
  name: string,
): Promise<string> {
  const baseUrl = getBaseUrl();
  const signUp = await getBootstrapAuth().api.signUpEmail({
    body: {
      email,
      password,
      name,
      callbackURL: `${baseUrl}${authRoutes.verifyEmail}?status=success`,
    },
  });

  if (!signUp?.user?.id) {
    throw new Error("signUpEmail did not return a user id");
  }

  await markBootstrapUserReady(signUp.user.id, name);
  await ensureSuperAdminRoles(signUp.user.id);
  return signUp.user.id;
}

async function main(): Promise<void> {
  const { email, password, name } = getBootstrapConfig();

  console.log(`[bootstrap-admin] Ensuring super_admin for ${maskEmail(email)}`);

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
    await syncBootstrapPassword(userId, password);
    await ensureSuperAdminRoles(userId);
    log.info("Bootstrap admin updated", { userId, email: existing.email });
    console.log(
      `[bootstrap-admin] OK: ${existing.email} (existing user — password synced, super_admin ensured)`,
    );
  } else {
    userId = await createBootstrapUser(email, password, name);
    log.info("Bootstrap admin created", { userId, email });
    console.log(`[bootstrap-admin] OK: ${email} created with super_admin role`);
  }

  await verifyBootstrapAdmin(userId, email);
  console.log(`[bootstrap-admin] Verified: super_admin role active for ${maskEmail(email)}`);

  await closeDatabase();
}

main().catch((err) => {
  log.error("Bootstrap admin failed", err);
  console.error(
    "[bootstrap-admin] Failed:",
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
