import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { AppError } from "@/lib/errors";
import { uploadProfilePhoto } from "@/lib/auth/upload-profile-photo";
import { validateProfilePhoto } from "@/lib/validations/auth";
import { deleteStoredObjectIfReplaced } from "@/lib/storage/object-lifecycle";
import { getDialByCountryCode } from "@/lib/constants/phone-countries";
import { normalizeSportInterestSlugs } from "@/lib/auth/profile-completion";
import type { StaffProfileUpdateInput } from "@/lib/validations/account-settings";

export async function updateStaffProfile(
  userId: string,
  data: StaffProfileUpdateInput,
  photoFile: File | null,
) {
  const [existing] = await getDb()
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existing) {
    throw new AppError("User not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  let imageUrl = existing.image;
  let imageStorageKey = existing.imageStorageKey;

  if (photoFile && photoFile.size > 0) {
    const photoValidation = validateProfilePhoto(photoFile);
    if (!photoValidation.ok) {
      throw new AppError(photoValidation.message, {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: { photo: [photoValidation.message] } },
      });
    }

    const upload = await uploadProfilePhoto(photoFile, existing.email);
    if (!upload.ok) {
      throw new AppError(upload.error, { code: "STORAGE_ERROR", statusCode: 500 });
    }

    await deleteStoredObjectIfReplaced(
      existing.imageStorageKey ?? existing.image,
      upload.storageKey,
    );
    imageUrl = upload.url;
    imageStorageKey = upload.storageKey;
  }

  const phoneDialCode =
    getDialByCountryCode(data.phoneCountryCode) ?? data.phoneCountryCode;

  const updatePayload: Partial<typeof user.$inferInsert> = {
    fullNameKtp: data.fullNameKtp,
    name: data.fullNameKtp,
    phone: data.phone,
    phoneCountryCode: phoneDialCode,
    image: imageUrl,
    imageStorageKey,
    gender: data.gender,
    updatedAt: new Date(),
  };

  if (data.sportInterestSlugs) {
    updatePayload.sportInterestSlugs = normalizeSportInterestSlugs(data.sportInterestSlugs);
  }

  await getDb().update(user).set(updatePayload).where(eq(user.id, userId));

  try {
    const { syncOwnedPlayerProfilesFromSportInterests } = await import(
      "@/lib/account/player-profile/sync-owned-profiles"
    );
    await syncOwnedPlayerProfilesFromSportInterests(userId);
  } catch (err) {
    console.error(
      "[settings] syncOwnedPlayerProfilesFromSportInterests failed after profile update",
      err instanceof Error ? err.message : err,
    );
  }

  try {
    const { reconcileDashboardSportCookie } = await import("@/lib/dashboard/sport-context");
    await reconcileDashboardSportCookie(userId);
  } catch {
    // non-fatal
  }

  try {
    const { syncPlayerPrimaryPhotoFromUser } = await import(
      "@/lib/account/player-profile/sync-primary-photo"
    );
    const { syncPlayerDisplayNameFromUser } = await import(
      "@/lib/account/player-profile/resolve-display-name"
    );
    await syncPlayerPrimaryPhotoFromUser(userId);
    await syncPlayerDisplayNameFromUser(userId);
  } catch {
    // non-fatal wiki mirrors
  }

  return { success: true as const };
}
