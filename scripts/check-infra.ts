import "dotenv/config";
import { runHealthChecks } from "@/lib/health";
import { closeDatabase } from "@/db/client";
import { closeRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "check-infra" });

async function main() {
  const report = await runHealthChecks();
  console.log(JSON.stringify(report, null, 2));

  await closeDatabase();
  await closeRedis();

  if (report.status !== "healthy") {
    log.error("Infrastructure check failed", undefined, { status: report.status });
    process.exit(1);
  }

  log.info("All infrastructure services healthy");
}

main().catch((err) => {
  log.error("Infrastructure check crashed", err);
  process.exit(1);
});
