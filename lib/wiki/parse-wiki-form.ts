import "server-only";

import type { WikiEntityType } from "@/db/schema/wiki";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { uploadWikiImage, validateWikiImageFile } from "@/lib/wiki/upload-media";
import {
  wikiEntityUpsertSchema,
  type WikiEntityUpsertInput,
} from "@/lib/validations/wiki-entities";
import { AppError } from "@/lib/errors";
import {
  equipmentFromAttributes,
  mergeEquipmentIntoAttributes,
  type PlayerEquipmentItem,
} from "@/lib/wiki/player-equipment";
import { WIKI_GALLERY_MAX } from "@/lib/wiki/constants";

const MAX_GALLERY_UPLOADS = WIKI_GALLERY_MAX;

function parseJsonField<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export type ParsedWikiFormResult = {
  data: WikiEntityUpsertInput;
  imagePatch: {
    heroStorageKey?: string;
    heroUrl?: string;
    primaryStorageKey?: string;
    primaryUrl?: string;
    clearPrimary?: boolean;
    clearHero?: boolean;
  };
};

export async function parseAndUploadWikiForm(
  formData: FormData,
  sportSlug: string,
): Promise<
  | { ok: true; result: ParsedWikiFormResult }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const rawGallery = parseJsonField(formData.get("gallery"), [] as WikiEntityUpsertInput["gallery"]);

  const parsed = wikiEntityUpsertSchema.safeParse({
    entityType: formData.get("entityType"),
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname") ?? "",
    slug: formData.get("slug") || undefined,
    summary: formData.get("summary") ?? "",
    biography: formData.get("biography") ?? "",
    status: formData.get("status") ?? "draft",
    attributes: parseJsonField(formData.get("attributes"), {}),
    performance: parseJsonField(formData.get("performance"), {}),
    specs: parseJsonField(formData.get("specs"), {}),
    features: parseJsonField(formData.get("features"), []),
    sourceType: formData.get("sourceType") ?? "manual",
    sourceUrl: formData.get("sourceUrl") ?? "",
    relations: parseJsonField(formData.get("relations"), []),
    gallery: rawGallery,
    heroImageUrl: formData.get("heroImageUrl") ?? "",
    primaryImageUrl: formData.get("primaryImageUrl") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      body: {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const entityType = parsed.data.entityType as WikiEntityType;
  const data: WikiEntityUpsertInput = {
    ...parsed.data,
    summary: parsed.data.summary ? sanitizeRichText(parsed.data.summary) : parsed.data.summary,
    biography: parsed.data.biography
      ? sanitizeRichText(parsed.data.biography)
      : parsed.data.biography,
  };

  let imagePatch: ParsedWikiFormResult["imagePatch"] = {};

  const heroFile = formData.get("heroImage");
  if (heroFile instanceof File && heroFile.size > 0) {
    const v = validateWikiImageFile(heroFile);
    if (!v.ok) {
      return { ok: false, status: 422, body: { error: v.message } };
    }
    const up = await uploadWikiImage(v.file, sportSlug, entityType);
    if (!up.ok) {
      throw new AppError(up.error, { code: "STORAGE_ERROR", statusCode: 500 });
    }
    imagePatch = { ...imagePatch, heroStorageKey: up.storageKey, heroUrl: up.url };
  }

  const primaryFile = formData.get("primaryImage");
  if (primaryFile instanceof File && primaryFile.size > 0) {
    const v = validateWikiImageFile(primaryFile);
    if (!v.ok) {
      return { ok: false, status: 422, body: { error: v.message } };
    }
    const up = await uploadWikiImage(v.file, sportSlug, entityType);
    if (!up.ok) {
      throw new AppError(up.error, { code: "STORAGE_ERROR", statusCode: 500 });
    }
    imagePatch = {
      ...imagePatch,
      primaryStorageKey: up.storageKey,
      primaryUrl: up.url,
    };
  }

  const galleryFiles = formData
    .getAll("galleryImages")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_GALLERY_UPLOADS);

  const keptExisting = data.gallery.filter((g) => g.url || g.storageKey);
  const uploaded: WikiEntityUpsertInput["gallery"] = [];

  for (let i = 0; i < galleryFiles.length; i++) {
    const file = galleryFiles[i]!;
    const v = validateWikiImageFile(file);
    if (!v.ok) {
      return { ok: false, status: 422, body: { error: `Gallery: ${v.message}` } };
    }
    const up = await uploadWikiImage(v.file, sportSlug, entityType);
    if (!up.ok) {
      throw new AppError(up.error, { code: "STORAGE_ERROR", statusCode: 500 });
    }
    uploaded.push({
      url: up.url,
      storageKey: up.storageKey,
      sortOrder: keptExisting.length + i,
    });
  }

  const clearPrimary = formData.get("clearPrimaryImage") === "true";
  const clearHero = formData.get("clearHeroImage") === "true";
  const hasNewPrimary = primaryFile instanceof File && primaryFile.size > 0;
  const hasNewHero = heroFile instanceof File && heroFile.size > 0;

  if (clearPrimary && !hasNewPrimary) {
    imagePatch = { ...imagePatch, clearPrimary: true };
  }
  if (clearHero && !hasNewHero) {
    imagePatch = { ...imagePatch, clearHero: true };
  }

  const totalGallery = [...keptExisting, ...uploaded].slice(0, MAX_GALLERY_UPLOADS);
  data.gallery = totalGallery;

  if (entityType === "player") {
    const equipment = equipmentFromAttributes(data.attributes);
    const equipmentFiles = new Map<string, File>();
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("equipmentImage_") && value instanceof File && value.size > 0) {
        equipmentFiles.set(key.slice("equipmentImage_".length), value);
      }
    }

    if (equipmentFiles.size > 0) {
      const updated: PlayerEquipmentItem[] = [];
      for (const item of equipment) {
        const file = equipmentFiles.get(item.id);
        if (!file) {
          updated.push(item);
          continue;
        }
        const v = validateWikiImageFile(file);
        if (!v.ok) {
          return { ok: false, status: 422, body: { error: `Equipment: ${v.message}` } };
        }
        const up = await uploadWikiImage(v.file, sportSlug, entityType);
        if (!up.ok) {
          throw new AppError(up.error, { code: "STORAGE_ERROR", statusCode: 500 });
        }
        updated.push({
          ...item,
          imageUrl: up.url,
          imageStorageKey: up.storageKey,
        });
      }
      data.attributes = mergeEquipmentIntoAttributes(data.attributes, updated);
    }
  }

  return { ok: true, result: { data, imagePatch } };
}
