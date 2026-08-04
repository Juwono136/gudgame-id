import { z } from "zod";

/**
 * Better Auth stores user ids as opaque text (not UUIDs).
 * Live scoring payloads must accept those ids for scorer attribution.
 */
export const optionalAuthUserIdSchema = z.preprocess((value) => {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Client-side synthetic roster keys (no real account).
  if (trimmed.startsWith("name:")) return undefined;
  return trimmed;
}, z.string().min(1).max(128).optional());

export const optionalScorerNameSchema = z.preprocess((value) => {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().min(1).max(120).optional());

/** Optional serving side for race-to-N live scoring. */
export const optionalServingSideSchema = z.enum(["a", "b"]).optional();
