import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { getPaymentInvoiceDocument } from "@/lib/tournaments/payments/payment-invoice";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ paymentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { paymentId: raw } = await context.params;
    const paymentId = parseEntityIdParam(raw, "payment id");

    const document = await getPaymentInvoiceDocument(paymentId, userId, roles);
    return jsonSuccess(document);
  } catch (error) {
    return jsonError(error);
  }
}
