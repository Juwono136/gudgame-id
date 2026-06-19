import { jsonError, jsonSuccess } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import {
  initiateCheckoutPayment,
} from "@/lib/tournaments/payments/checkout-payment";
import type { CheckoutPaymentMethod } from "@/lib/tournaments/payments/checkout-methods";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  method: z.enum(["qris", "bank_transfer", "ewallet", "card"]),
  bankCode: z.string().optional(),
  sportSlug: z.string(),
  slug: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;
    const registrationId = parseEntityIdParam(id, "registration id");

    await enforceRateLimit({
      key: `checkout-pay:${userId}`,
      limit: 15,
      windowSeconds: 60,
    });

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid payment request", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const tournament = await getTournamentBySlug(parsed.data.sportSlug, parsed.data.slug);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const instructions = await initiateCheckoutPayment(
      tournament,
      registrationId,
      userId,
      parsed.data.method as CheckoutPaymentMethod,
      parsed.data.bankCode,
    );

    return jsonSuccess({ instructions });
  } catch (error) {
    return jsonError(error);
  }
}
