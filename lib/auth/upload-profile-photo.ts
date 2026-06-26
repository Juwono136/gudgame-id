import "server-only";
import { uploadProfilePhotoToStorage } from "@/lib/storage/profile-photos";

/** @deprecated Use uploadProfilePhotoToStorage — kept for import stability */
export async function uploadProfilePhoto(
  file: File,
  email: string,
): Promise<{ ok: true; url: string; storageKey: string } | { ok: false; error: string }> {
  const result = await uploadProfilePhotoToStorage(file, email);
  if (!result.ok) return result;
  return {
    ok: true,
    url: result.data.publicUrl,
    storageKey: result.data.storageKey,
  };
}
