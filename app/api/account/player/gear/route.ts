import { jsonError, jsonSuccess } from "@/lib/api/response";
import { parseRequestJson } from "@/lib/api/parse-request-json";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import { getPlayerWikiProfileForUser } from "@/lib/account/player-profile/service";
import { createPlayerPublishedGear } from "@/lib/wiki/gear/player-create";
import { playerGearCreateSchema } from "@/lib/wiki/gear/validation";
import { uploadWikiImage, validateWikiImageFile } from "@/lib/wiki/upload-media";
import { z } from "zod";

export const runtime = "nodejs";

function parseGearFieldsFromFormData(formData: FormData) {
  const priceRaw = String(formData.get("priceIdr") ?? "").trim();
  return playerGearCreateSchema.parse({
    displayName: String(formData.get("displayName") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    gearCategory: String(formData.get("gearCategory") ?? "racket"),
    priceIdr: priceRaw ? Number(priceRaw.replace(/[^\d]/g, "")) : undefined,
    notes: String(formData.get("notes") ?? ""),
  });
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiRoleGuardContext();
    await enforceRateLimit({
      key: `player-gear-create:${ctx.userId}`,
      limit: 10,
      windowSeconds: 60,
    });

    const profile = await getPlayerWikiProfileForUser(ctx.userId);
    if (!profile) {
      throw new AppError("Create your player profile before adding gear", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const sport = await import("@/lib/wiki/public").then((m) =>
      m.getSportBySlug(profile.sportSlug),
    );
    if (!sport) {
      throw new AppError("Sport not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let parsed: z.infer<typeof playerGearCreateSchema>;
    let imageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      parsed = parseGearFieldsFromFormData(formData);
      const file = formData.get("image");
      if (file instanceof File && file.size > 0) imageFile = file;
    } else {
      const body = await parseRequestJson(request);
      const result = playerGearCreateSchema.safeParse(body);
      if (!result.success) {
        throw new AppError("Invalid gear details", {
          code: "VALIDATION_ERROR",
          statusCode: 422,
          context: { fieldErrors: result.error.flatten().fieldErrors },
        });
      }
      parsed = result.data;
    }

    let primaryImageUrl: string | undefined;
    let primaryStorageKey: string | undefined;

    if (imageFile) {
      const validation = validateWikiImageFile(imageFile);
      if (!validation.ok) {
        throw new AppError(validation.message, {
          code: "VALIDATION_ERROR",
          statusCode: 422,
        });
      }
      const uploaded = await uploadWikiImage(validation.file, profile.sportSlug, "gear");
      if (!uploaded.ok) {
        throw new AppError(uploaded.error, { code: "STORAGE_ERROR", statusCode: 500 });
      }
      primaryImageUrl = uploaded.url;
      primaryStorageKey = uploaded.storageKey;
    }

    const item = await createPlayerPublishedGear({
      sportId: sport.id,
      ownerUserId: ctx.userId,
      displayName: parsed.displayName,
      brand: parsed.brand,
      gearCategory: parsed.gearCategory,
      priceIdr: parsed.priceIdr,
      notes: parsed.notes,
      primaryImageUrl,
      primaryImageStorageKey: primaryStorageKey,
    });

    return jsonSuccess({ item });
  } catch (error) {
    return jsonError(error);
  }
}
