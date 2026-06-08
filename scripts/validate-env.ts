import "dotenv/config";
import { assertProductionEnv, tryGetServerEnv } from "@/lib/config/env.server";
import { getClientEnv } from "@/lib/config/env.client";
import { logger } from "@/lib/logger";

const log = logger.child({ script: "validate-env" });

function main() {
  const server = tryGetServerEnv();
  if (!server.ok) {
    log.error("Server environment invalid", undefined, { error: server.error });
    process.exit(1);
  }

  try {
    getClientEnv();
  } catch (err) {
    log.error("Client environment invalid", err);
    process.exit(1);
  }

  if (process.env.STRICT_PRODUCTION_ENV === "true") {
    assertProductionEnv();
  }

  log.info("Environment validation passed", {
    nodeEnv: server.data.NODE_ENV,
    storageMode: server.data.STORAGE_AUTH_MODE,
  });
}

main();
