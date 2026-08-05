import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireUserManagementAccess } from "@/lib/admin/session";
import { AppError } from "@/lib/errors";
import {
  SITE_MEDIA_KINDS,
  deleteSiteHomepageImage,
  uploadSiteHomepageImage,
  type SiteMediaKind,
} from "@/lib/site/upload-media";

export const runtime = "nodejs";

function isSiteMediaKind(value: string): value is SiteMediaKind {
  return (SITE_MEDIA_KINDS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  try {
    await requireUserManagementAccess();

    const form = await request.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") ?? "");
    const previousUrl = String(form.get("previousUrl") ?? "") || null;

    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("Image file is required", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    if (!isSiteMediaKind(kindRaw)) {
      throw new AppError("Invalid media kind", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const result = await uploadSiteHomepageImage(file, kindRaw, { previousUrl });
    if (!result.ok) {
      throw new AppError(result.error, {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    return jsonSuccess({
      url: result.url,
      storageKey: result.storageKey,
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** Clear a homepage image from SeaweedFS (used when resetting to the built-in default). */
export async function DELETE(request: Request) {
  try {
    await requireUserManagementAccess();

    const { searchParams } = new URL(request.url);
    const kindRaw = searchParams.get("kind") ?? "";
    const previousUrl = searchParams.get("previousUrl");

    if (!isSiteMediaKind(kindRaw)) {
      throw new AppError("Invalid media kind", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    await deleteSiteHomepageImage(kindRaw, previousUrl);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
