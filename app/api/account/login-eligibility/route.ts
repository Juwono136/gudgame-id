import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getUserAuthProvidersByEmail } from "@/lib/auth/account-providers";
import { getUserAccountStatusByEmail } from "@/lib/auth/account-status";

const bodySchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const status = await getUserAccountStatusByEmail(email);

    if (!status) {
      return jsonSuccess({ eligible: true });
    }

    if (!status.isActive) {
      return jsonSuccess({
        eligible: false,
        reason: "account_inactive" as const,
      });
    }

    const providers = await getUserAuthProvidersByEmail(email);
    if (providers?.isGoogleOnly) {
      return jsonSuccess({
        eligible: false,
        reason: "google_only" as const,
      });
    }

    return jsonSuccess({ eligible: true });
  } catch (error) {
    return jsonError(error);
  }
}
