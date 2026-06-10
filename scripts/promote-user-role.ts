/**
 * Assign roles to an existing user by email (dev / bootstrap).
 *
 * Usage:
 *   npx tsx scripts/promote-user-role.ts --email=admin@example.com --roles=super_admin,host,player
 *
 * Requires DATABASE_URL in .env
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDatabase, getDb } from "../db/client";
import { user } from "../db/schema/auth";
import { APP_ROLES, type AppRole } from "../lib/roles/constants";
import { setUserRoles } from "../lib/roles/sync";
import { logger } from "../lib/logger";

const log = logger.child({ script: "promote-user-role" });

function parseArgs(argv: string[]) {
  let email = "";
  let roles: AppRole[] = ["super_admin"];

  for (const arg of argv) {
    if (arg.startsWith("--email=")) {
      email = arg.slice("--email=".length).trim().toLowerCase();
    } else if (arg.startsWith("--roles=")) {
      const raw = arg.slice("--roles=".length).split(",").map((r) => r.trim());
      roles = raw.filter((r): r is AppRole => APP_ROLES.includes(r as AppRole));
    }
  }

  return { email, roles };
}

async function main() {
  const { email, roles } = parseArgs(process.argv.slice(2));

  if (!email) {
    console.error(
      "Usage: npx tsx scripts/promote-user-role.ts --email=user@example.com --roles=super_admin,host,player",
    );
    process.exit(1);
  }

  if (roles.length === 0) {
    console.error(`Invalid roles. Allowed: ${APP_ROLES.join(", ")}`);
    process.exit(1);
  }

  const db = getDb();
  const [row] = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!row) {
    console.error(`No user found with email: ${email}`);
    console.error("Register the account first at /register, then run this script.");
    process.exit(1);
  }

  await setUserRoles(row.id, roles);

  log.info("Roles updated", { userId: row.id, email: row.email, roles });
  console.log(`Updated ${row.name ?? row.email} (${row.email})`);
  console.log(`Roles: ${roles.join(", ")}`);

  await closeDatabase();
}

main().catch((err) => {
  log.error("Failed", err);
  process.exit(1);
});
