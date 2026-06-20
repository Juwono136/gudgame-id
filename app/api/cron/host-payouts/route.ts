import { jsonError, jsonSuccess } from "@/lib/api/response";
import { verifyCronSecret } from "@/lib/cron/verify-cron-secret";
import { runScheduledHostPayoutJob } from "@/lib/payments/host-payout/disbursement/job";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const log = logger.child({ module: "cron-host-payouts" });

export async function GET(request: Request) {
  try {
    verifyCronSecret(request);
    log.info("Starting scheduled host payout job");
    const result = await runScheduledHostPayoutJob();
    return jsonSuccess({ job: result });
  } catch (error) {
    log.error("Scheduled host payout job failed", { error });
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  return GET(request);
}
