import { z } from "zod";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import {
  confirmPartnerRegistration,
  declinePartnerRegistration,
  getPartnerRegistrationById,
} from "@/lib/partners/registration/service";
import { assertCanManageRoster } from "@/lib/tournaments/manage-access";
import { getTournamentBySlug } from "@/lib/tournaments/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["confirm", "decline"]),
});

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ sportSlug: string; slug: string; registrationId: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug, registrationId: rawId } = await params;
    const registrationId = parseEntityIdParam(rawId, "registration id");
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (!tournament.partnerId) {
      throw new AppError("Not a partner tournament", {
        code: "INVALID_TOURNAMENT_TYPE",
        statusCode: 400,
      });
    }

    await assertCanManageRoster(tournament, userId, roles);

    const detail = await getPartnerRegistrationById(registrationId);
    if (!detail || detail.registration.tournamentId !== tournament.id) {
      throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (detail.registration.partnerId !== tournament.partnerId) {
      throw new AppError("Registration not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid action", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    if (parsed.data.action === "confirm") {
      await confirmPartnerRegistration(registrationId);
    } else {
      await declinePartnerRegistration(registrationId);
    }

    return jsonSuccess({ ok: true, action: parsed.data.action });
  } catch (error) {
    return jsonError(error);
  }
}
