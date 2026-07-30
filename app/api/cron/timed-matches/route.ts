import { jsonError, jsonSuccess } from "@/lib/api/response";
import { verifyCronSecret } from "@/lib/cron/verify-cron-secret";
import { finalizeExpiredTimedMatches } from "@/lib/tournaments/lifecycle/finalize-expired-timed-matches";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const log = logger.child({ module: "cron-timed-matches" });

export async function GET(request: Request) {
  try {
    verifyCronSecret(request);
    log.info("Starting timed match finalize job");
    const result = await finalizeExpiredTimedMatches();
    return jsonSuccess({ job: result });
  } catch (error) {
    log.error("Timed match finalize job failed", { error });
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  return GET(request);
}
