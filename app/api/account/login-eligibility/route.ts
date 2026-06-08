import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getUserAccountStatusByEmail } from "@/lib/auth/account-status";

const bodySchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const status = await getUserAccountStatusByEmail(body.email);

    if (!status) {
      return jsonSuccess({ eligible: true });
    }

    if (!status.isActive) {
      return jsonSuccess({
        eligible: false,
        reason: "account_inactive" as const,
      });
    }

    return jsonSuccess({ eligible: true });
  } catch (error) {
    return jsonError(error);
  }
}
