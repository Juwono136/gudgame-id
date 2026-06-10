import "server-only";

import { isXenditConfigured } from "@/lib/payments/xendit/client";

/** XenPlatform split payouts — enabled when Xendit is configured unless explicitly disabled */
export function isXenPlatformEnabled(): boolean {
  if (!isXenditConfigured()) return false;
  const flag = process.env.XENDIT_XENPLATFORM_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}
