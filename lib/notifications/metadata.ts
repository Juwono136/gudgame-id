import { isUuid } from "@/lib/domain/uuid";

/** Read tournament/registration id from notification metadata (UUID or legacy number). */
export function readNotificationEntityId(value: unknown): string | null {
  if (typeof value === "string" && isUuid(value)) {
    return value;
  }
  // Pre-migration notifications stored integer ids; cannot resolve without a mapping table.
  return null;
}
