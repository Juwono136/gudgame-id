import "server-only";

import { DEFAULT_SPORT_MODULES } from "@/db/schema/sports";
import { AppError } from "@/lib/errors";
import { deleteStoredObjectIfReplaced } from "@/lib/storage/object-lifecycle";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { sportUpsertSchema, type SportUpsertInput } from "@/lib/validations/sports-admin";
import { uploadSportHeroImage } from "@/lib/sports/upload-media";

export type ParsedSportForm = {
  input: SportUpsertInput;
  heroImageUrl?: string | null;
  heroImageStorageKey?: string | null;
  clearHeroImage?: boolean;
};

function parseModules(raw: string | null): SportUpsertInput["modules"] {
  if (!raw?.trim()) return DEFAULT_SPORT_MODULES;
  try {
    const parsed = JSON.parse(raw) as SportUpsertInput["modules"];
    return { ...DEFAULT_SPORT_MODULES, ...parsed };
  } catch {
    return DEFAULT_SPORT_MODULES;
  }
}

export async function parseSportAdminForm(
  formData: FormData,
  options?: {
    existingSlug?: string;
    existingHeroStorageKey?: string | null;
    existingHeroImageUrl?: string | null;
  },
): Promise<ParsedSportForm> {
  const name = String(formData.get("name") ?? "").trim();
  const slug =
    options?.existingSlug?.trim() ||
    slugifyWikiName(name) ||
    String(formData.get("slug") ?? "").trim();

  const payload = {
    name,
    slug,
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    rulesSummary: sanitizeRichText(String(formData.get("rulesSummary") ?? "")),
    rulesContent: String(formData.get("rulesContent") ?? ""),
    howToPlay: String(formData.get("howToPlay") ?? ""),
    equipmentOverview: String(formData.get("equipmentOverview") ?? ""),
    accentColor: String(formData.get("accentColor") ?? ""),
    visibility: String(formData.get("visibility") ?? "coming_soon"),
    modules: parseModules(formData.get("modules") as string | null),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = sportUpsertSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError("Validation failed", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
      context: { fieldErrors: parsed.error.flatten().fieldErrors },
    });
  }

  const clearHeroImage = formData.get("clearHeroImage") === "true";
  let heroImageUrl = options?.existingHeroImageUrl ?? null;
  let heroImageStorageKey = options?.existingHeroStorageKey ?? null;

  const heroFile = formData.get("heroImage");
  if (heroFile instanceof File && heroFile.size > 0) {
    const upload = await uploadSportHeroImage(heroFile, parsed.data.slug);
    if (!upload.ok) {
      throw new AppError(upload.error, { code: "STORAGE_ERROR", statusCode: 500 });
    }
    await deleteStoredObjectIfReplaced(
      heroImageStorageKey,
      upload.storageKey,
    );
    heroImageUrl = upload.url;
    heroImageStorageKey = upload.storageKey;
  } else if (clearHeroImage) {
    await deleteStoredObjectIfReplaced(heroImageStorageKey, null);
    heroImageUrl = null;
    heroImageStorageKey = null;
  }

  return {
    input: parsed.data,
    heroImageUrl,
    heroImageStorageKey,
    clearHeroImage,
  };
}
