import { jsonError, jsonSuccess } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import {
  confirmParticipation,
  declineParticipation,
  loadPayerEmail,
} from "@/lib/tournaments/registration/confirmation";
import { getTournamentBySlug } from "@/lib/tournaments/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;
    const registrationId = parseEntityIdParam(id, "registration id");

    await enforceRateLimit({
      key: `registration-confirm:${userId}`,
      limit: 20,
      windowSeconds: 60,
    });

    const url = new URL(_request.url);
    const sportSlug = url.searchParams.get("sportSlug");
    const slug = url.searchParams.get("slug");
    if (!sportSlug || !slug) {
      throw new AppError("Tournament context required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const tournament = await getTournamentBySlug(sportSlug, slug);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const payerEmail = await loadPayerEmail(userId);
    const result = await confirmParticipation(tournament, registrationId, userId, payerEmail);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireApiRoleGuardContext();
    const { id } = await params;
    const registrationId = parseEntityIdParam(id, "registration id");

    const url = new URL(_request.url);
    const sportSlug = url.searchParams.get("sportSlug");
    const slug = url.searchParams.get("slug");
    if (!sportSlug || !slug) {
      throw new AppError("Tournament context required", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    }

    const tournament = await getTournamentBySlug(sportSlug, slug);
    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    await declineParticipation(tournament, registrationId, userId);
    return jsonSuccess({ declined: true });
  } catch (error) {
    return jsonError(error);
  }
}
