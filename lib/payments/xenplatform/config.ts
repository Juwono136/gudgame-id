import "server-only";

import { isXenditStagingMode } from "@/lib/config/xendit-env";
import { isXenditConfigured } from "@/lib/payments/xendit/client";

/** XenPlatform split payouts — production live only; staging collects to master account */
export function isXenPlatformEnabled(): boolean {
  if (!isXenditConfigured()) return false;
  if (isXenditStagingMode()) return false;
  const flag = process.env.XENDIT_XENPLATFORM_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}
