import "server-only";

import { listHostPayoutCandidates } from "@/lib/payments/host-payout/disbursement/queries";
import { processHostScheduledPayout } from "@/lib/payments/host-payout/disbursement/processor";
import type { HostPayoutJobResult } from "@/lib/payments/host-payout/disbursement/types";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "host-payout-job" });

export async function runScheduledHostPayoutJob(
  now: Date = new Date(),
): Promise<HostPayoutJobResult> {
  const startedAt = now.toISOString();
  const candidates = await listHostPayoutCandidates();
  const results = [];

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const result = await processHostScheduledPayout(candidate, now);
      results.push(result);

      if (result.outcome === "processed") processed += 1;
      else if (result.outcome === "failed") failed += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      const reason = error instanceof Error ? error.message : String(error);
      log.error("Unexpected host payout job error", {
        hostUserId: candidate.hostUserId,
        error: reason,
      });
      results.push({
        hostUserId: candidate.hostUserId,
        outcome: "failed" as const,
        reason,
      });
    }
  }

  const finishedAt = new Date().toISOString();
  log.info("Scheduled host payout job finished", {
    hostsChecked: candidates.length,
    processed,
    skipped,
    failed,
  });

  return {
    startedAt,
    finishedAt,
    hostsChecked: candidates.length,
    processed,
    skipped,
    failed,
    results,
  };
}
