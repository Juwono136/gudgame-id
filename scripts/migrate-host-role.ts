import "dotenv/config";
import { closeDatabase } from "@/db/client";
import { migrateContributorRoleToHost } from "@/lib/roles/migrate-host-role";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "migrate-host-role" });

async function main() {
  log.info("Starting contributor → host role migration");
  await migrateContributorRoleToHost();
  await closeDatabase();
  log.info("Migration completed");
}

main().catch((err) => {
  log.error("Migration failed", err);
  process.exit(1);
});
