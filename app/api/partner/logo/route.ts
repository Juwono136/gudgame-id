import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { cleanupPartnerBrandMedia } from "@/lib/partners/media-lifecycle";
import { getPrimaryPartnerForUser, updatePartnerBranding } from "@/lib/partners/service";
import { uploadPartnerLogoImage } from "@/lib/partners/upload-logo";

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

    const previousStorageKey = partner.logoStorageKey;
    const previousUrl = partner.logoUrl;

    const result = await uploadPartnerLogoImage(file, partner.id);
    if (!result.ok) {
      throw new AppError(result.error, { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const updated = await updatePartnerBranding(partner.id, {
      logoUrl: result.url,
      logoStorageKey: result.storageKey,
    });

    // After DB points at the new object, purge prior logo objects (UUID + other exts).
    await cleanupPartnerBrandMedia({
      partnerId: partner.id,
      kind: "logo",
      keepKey: result.storageKey,
      previousStorageKey,
      previousUrl,
    });

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

    const previousStorageKey = partner.logoStorageKey;
    const previousUrl = partner.logoUrl;

    const updated = await updatePartnerBranding(partner.id, {
      logoUrl: null,
      logoStorageKey: null,
    });

    await cleanupPartnerBrandMedia({
      partnerId: partner.id,
      kind: "logo",
      keepKey: null,
      previousStorageKey,
      previousUrl,
    });

    return jsonSuccess({ partner: updated, deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
