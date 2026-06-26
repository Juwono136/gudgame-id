import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { getIndonesiaBankCodes } from "@/lib/payments/iluma/banks";
import { getPayoutBankChannels } from "@/lib/payments/xendit/payout-channels";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireHostDashboardAccess();
    // Prefer Iluma (full Indonesian bank coverage + used for verification).
    // Fallback to Xendit payout channels if Iluma is not configured.
    const banks = process.env.ILUMA_API_KEY?.trim()
      ? await getIndonesiaBankCodes()
      : await getPayoutBankChannels();
    return jsonSuccess({ banks });
  } catch (error) {
    return jsonError(error);
  }
}

