import "server-only";

import { isXenditStagingMode } from "@/lib/config/xendit-env";
import { isXenditConfigured, isXenditDevelopmentKey, isXenditProductionKey } from "@/lib/payments/xendit/client";

/** XenPlatform split payouts — production live keys only; dev/staging use master account */
export function isXenPlatformEnabled(): boolean {
  if (!isXenditConfigured()) return false;
  if (isXenditStagingMode()) return false;

  const key = process.env.XENDIT_SECRET_KEY;
  if (isXenditDevelopmentKey(key)) return false;

  const flag = process.env.XENDIT_XENPLATFORM_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

/** True when host split rules must succeed (production xenPlatform). */
export function isXenPlatformProductionSplitRequired(): boolean {
  return isXenPlatformEnabled() && isXenditProductionKey(process.env.XENDIT_SECRET_KEY);
}
