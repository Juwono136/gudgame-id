/** Deployed app with NODE_ENV=production but Xendit Test (development) API keys. */
export function isXenditStagingMode(): boolean {
  return process.env.XENDIT_STAGING_MODE === "true";
}

export function isXenditDevelopmentKey(key: string | undefined): boolean {
  return Boolean(key?.trim().startsWith("xnd_development_"));
}

export function isXenditProductionKey(key: string | undefined): boolean {
  return Boolean(key?.trim().startsWith("xnd_production_"));
}
