/**
 * Idempotent bootstrap: ensure a super_admin account exists (CI / first deploy).
 *
 * Env (GitHub Secrets):
 *   BOOTSTRAP_ADMIN_EMAIL
 *   BOOTSTRAP_ADMIN_PASSWORD  (min 8 chars — Better Auth rule)
 *   BOOTSTRAP_ADMIN_NAME      (optional, default "Super Admin")
 *
 * Skips silently when email/password are unset so deploy works before secrets are added.
 */
import { eq } from "drizzle-orm";
import { closeDatabase, getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth/server";
import { authRoutes } from "@/lib/constants/routes";
import { getBaseUrl } from "@/lib/auth/urls-server";
import { setUserRoles } from "@/lib/roles/sync";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "bootstrap-admin-user" });

const DEFAULT_NAME = "Super Admin";
const BOOTSTRAP_ROLES = ["super_admin", "player"] as const;

function getBootstrapConfig():
  | { email: string; password: string; name: string }
  | null {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";

  if (!email || !password) {
    log.info(
      "BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD not set — skipping bootstrap admin",
    );
    return null;
  }

  if (password.length < 8) {
    console.error(
      "[bootstrap-admin] BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.",
    );
    process.exit(1);
  }

  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || DEFAULT_NAME;
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

async function createBootstrapUser(
  email: string,
  password: string,
  name: string,
): Promise<string> {
  const baseUrl = getBaseUrl();
  const signUp = await auth.api.signUpEmail({
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
  const config = getBootstrapConfig();
  if (!config) {
    return;
  }

  const { email, password, name } = config;
  const db = getDb();

  const [existing] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    await markBootstrapUserReady(existing.id, name);
    await ensureSuperAdminRoles(existing.id);
    log.info("Bootstrap admin already exists — roles and flags refreshed", {
      userId: existing.id,
      email: existing.email,
    });
    console.log(`[bootstrap-admin] OK: ${existing.email} (existing user, super_admin ensured)`);
    await closeDatabase();
    return;
  }

  const userId = await createBootstrapUser(email, password, name);
  log.info("Bootstrap admin created", { userId, email });
  console.log(`[bootstrap-admin] OK: ${email} created with super_admin role`);

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
