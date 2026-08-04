import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { cleanupPartnerBrandMedia } from "@/lib/partners/media-lifecycle";
import { getPrimaryPartnerForUser, updatePartnerBranding } from "@/lib/partners/service";
import { uploadPartnerIconImage } from "@/lib/partners/upload-icon";

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

    const previousStorageKey = partner.iconStorageKey;
    const previousUrl = partner.iconUrl;

    const result = await uploadPartnerIconImage(file, partner.id);
    if (!result.ok) {
      throw new AppError(result.error, { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const updated = await updatePartnerBranding(partner.id, {
      iconUrl: result.url,
      iconStorageKey: result.storageKey,
    });

    await cleanupPartnerBrandMedia({
      partnerId: partner.id,
      kind: "icon",
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

    const previousStorageKey = partner.iconStorageKey;
    const previousUrl = partner.iconUrl;

    const updated = await updatePartnerBranding(partner.id, {
      iconUrl: null,
      iconStorageKey: null,
    });

    await cleanupPartnerBrandMedia({
      partnerId: partner.id,
      kind: "icon",
      keepKey: null,
      previousStorageKey,
      previousUrl,
    });

    return jsonSuccess({ partner: updated, deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
