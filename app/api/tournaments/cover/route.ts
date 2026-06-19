import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { AppError } from "@/lib/errors";
import { uploadTournamentCoverImage } from "@/lib/tournaments/upload-cover";
import { deleteStoredObject } from "@/lib/storage/object-lifecycle";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireApiRoleGuardContext();
    const form = await request.formData();
    const file = form.get("file");
    const sportSlug = String(form.get("sportSlug") ?? "").trim();
    const tournamentIdRaw = form.get("tournamentId");
    const tournamentId =
      tournamentIdRaw != null && String(tournamentIdRaw).trim()
        ? parseEntityIdParam(String(tournamentIdRaw), "tournament id")
        : undefined;

    if (!sportSlug) {
      throw new AppError("sportSlug is required", { code: "VALIDATION_ERROR", statusCode: 422 });
    }
    if (!(file instanceof File)) {
      throw new AppError("file is required", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const result = await uploadTournamentCoverImage(file, sportSlug, tournamentId);
    if (!result.ok) {
      throw new AppError(result.error, { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    return jsonSuccess({
      url: result.url,
      storageKey: result.storageKey,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireApiRoleGuardContext();
    const { searchParams } = new URL(request.url);
    const storageKey = searchParams.get("storageKey")?.trim();
    if (!storageKey) {
      throw new AppError("storageKey is required", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    await deleteStoredObject(storageKey);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
