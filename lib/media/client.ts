/** Client-safe media URL helpers (no server secrets). */

export {
  getMediaProxyPath,
  resolveUserImageUrl,
  extractStorageObjectKey,
  isAllowedMediaKey,
  PROFILE_MEDIA_PREFIX,
  WIKI_MEDIA_PREFIX,
  SPORTS_MEDIA_PREFIX,
  TOURNAMENTS_MEDIA_PREFIX,
} from "@/lib/storage/media-url";

export { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";

export { formatDateTimePreview } from "@/lib/storage/format-datetime";
