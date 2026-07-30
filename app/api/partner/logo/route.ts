import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { getPrimaryPartnerForUser, updatePartnerBranding } from "@/lib/partners/service";
import { uploadPartnerLogoImage } from "@/lib/partners/upload-logo";
import { deleteStoredObject } from "@/lib/storage/object-lifecycle";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("file is required", { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const result = await uploadPartnerLogoImage(file, partner.id);
    if (!result.ok) {
      throw new AppError(result.error, { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const previousKey = partner.logoStorageKey;
    const updated = await updatePartnerBranding(partner.id, {
      logoUrl: result.url,
      logoStorageKey: result.storageKey,
    });

    if (previousKey && previousKey !== result.storageKey) {
      try {
        await deleteStoredObject(previousKey);
      } catch {
        // Non-fatal — new logo already saved.
      }
    }

    return jsonSuccess({
      partner: updated,
      url: result.url,
      storageKey: result.storageKey,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE() {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    if (partner.logoStorageKey) {
      try {
        await deleteStoredObject(partner.logoStorageKey);
      } catch {
        // Still clear DB fields if storage delete fails.
      }
    }

    const updated = await updatePartnerBranding(partner.id, {
      logoUrl: null,
      logoStorageKey: null,
    });

    return jsonSuccess({ partner: updated, deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
