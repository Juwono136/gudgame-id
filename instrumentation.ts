export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { isBuildTimeEnvValidationSkipped } = await import("@/lib/config/build-time");
    if (isBuildTimeEnvValidationSkipped()) return;

    const { assertProductionEnv } = await import("@/lib/config/env.server");
    const { isXenditStagingMode } = await import("@/lib/config/xendit-env");
    const { logger } = await import("@/lib/logger");
    const bootLog = logger.child({ module: "boot" });

    try {
      assertProductionEnv();
    } catch (err) {
      bootLog.error(
        "Production environment validation failed — app may be degraded until env is fixed",
        err,
      );
      return;
    }

    if (process.env.NODE_ENV === "production" && isXenditStagingMode()) {
      bootLog.warn(
        "XENDIT_STAGING_MODE is enabled — payments use Xendit Test keys (no real money). Set XENDIT_STAGING_MODE=false and switch to xnd_production_… before go-live.",
      );
    }
  }
}
