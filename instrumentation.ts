export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionEnv } = await import("@/lib/config/env.server");
    const { isXenditStagingMode } = await import("@/lib/config/xendit-env");
    const { logger } = await import("@/lib/logger");

    assertProductionEnv();

    if (process.env.NODE_ENV === "production" && isXenditStagingMode()) {
      logger
        .child({ module: "boot" })
        .warn(
          "XENDIT_STAGING_MODE is enabled — payments use Xendit Test keys (no real money). Set XENDIT_STAGING_MODE=false and switch to xnd_production_… before go-live.",
        );
    }
  }
}
