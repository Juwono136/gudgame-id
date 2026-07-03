import "server-only";

import { and, asc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  wikiScrapeHosts,
  type WikiScrapeHost,
  type WikiScrapeParserProfile,
} from "@/db/schema/wiki-scrape-hosts";
import { AppError } from "@/lib/errors";
import {
  SCRAPE_PARSER_PROFILES,
  type ScrapeParserProfile,
} from "@/lib/wiki/gear/constants";
import { z } from "zod";
import { normalizeScrapeHostnameInput } from "@/lib/wiki/scrape-hosts/normalize-hostname";

export const DEFAULT_SCRAPE_HOST_SEEDS: {
  hostname: string;
  label: string;
  parserProfile: ScrapeParserProfile;
}[] = [
  { hostname: "padeltop.id", label: "PadelTop", parserProfile: "padeltop" },
  { hostname: "www.padeltop.id", label: "PadelTop (www)", parserProfile: "padeltop" },
  { hostname: "padelful.com", label: "Padelful", parserProfile: "padelful" },
  { hostname: "www.padelful.com", label: "Padelful (www)", parserProfile: "padelful" },
  { hostname: "padelracket.id", label: "Padel Racket", parserProfile: "padelracket" },
  { hostname: "www.padelracket.id", label: "Padel Racket (www)", parserProfile: "padelracket" },
  { hostname: "decathlon.co.id", label: "Decathlon", parserProfile: "decathlon" },
  { hostname: "www.decathlon.co.id", label: "Decathlon (www)", parserProfile: "decathlon" },
];

const CACHE_TTL_MS = 60_000;
let hostCache: { expiresAt: number; hosts: Set<string> } | null = null;
let hostCacheKey = "";

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (h === "127.0.0.1" || h.startsWith("127.")) return true;
  if (h.startsWith("10.") || h.startsWith("192.168.") || h.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fe80:")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  return false;
}

export function normalizeScrapeHostname(raw: string): string {
  const trimmed = normalizeScrapeHostnameInput(raw);
  if (!trimmed) {
    throw new AppError("Hostname is required", { code: "VALIDATION_ERROR", statusCode: 422 });
  }

  if (isPrivateHost(trimmed)) {
    throw new AppError("Private or local hostnames are not allowed", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(trimmed)) {
    throw new AppError("Invalid hostname format", { code: "VALIDATION_ERROR", statusCode: 422 });
  }
  return trimmed;
}

const createHostSchema = z.object({
  hostname: z.string().trim().min(3).max(253),
  label: z.string().trim().min(1).max(120),
  parserProfile: z.enum(SCRAPE_PARSER_PROFILES).default("generic"),
  enabled: z.boolean().default(true),
  sportId: z.string().uuid().nullable().optional(),
});

const updateHostSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  parserProfile: z.enum(SCRAPE_PARSER_PROFILES).optional(),
  enabled: z.boolean().optional(),
});

export type ScrapeHostView = {
  id: string;
  sportId: string | null;
  hostname: string;
  label: string;
  parserProfile: WikiScrapeParserProfile;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapHost(row: WikiScrapeHost): ScrapeHostView {
  return {
    id: row.id,
    sportId: row.sportId,
    hostname: row.hostname,
    label: row.label,
    parserProfile: row.parserProfile as WikiScrapeParserProfile,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listScrapeHosts(sportId?: string | null): Promise<ScrapeHostView[]> {
  const db = getDb();
  const conditions = sportId
    ? or(isNull(wikiScrapeHosts.sportId), eq(wikiScrapeHosts.sportId, sportId))
    : undefined;

  const rows = await db
    .select()
    .from(wikiScrapeHosts)
    .where(conditions)
    .orderBy(asc(wikiScrapeHosts.hostname));

  return rows.map(mapHost);
}

export async function getEnabledScrapeHostnames(sportId?: string | null): Promise<Set<string>> {
  const env = process.env.WIKI_SCRAPE_ALLOWED_HOSTS?.trim();
  if (env) {
    return new Set(env.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean));
  }

  const cacheKey = sportId ?? "global";
  const now = Date.now();
  if (hostCache && hostCacheKey === cacheKey && hostCache.expiresAt > now) {
    return hostCache.hosts;
  }

  const db = getDb();
  const rows = await db
    .select({ hostname: wikiScrapeHosts.hostname })
    .from(wikiScrapeHosts)
    .where(
      and(
        eq(wikiScrapeHosts.enabled, true),
        sportId
          ? or(isNull(wikiScrapeHosts.sportId), eq(wikiScrapeHosts.sportId, sportId))
          : undefined,
      ),
    );

  const hosts = new Set(rows.map((r) => r.hostname.toLowerCase()));
  hostCache = { hosts, expiresAt: now + CACHE_TTL_MS };
  hostCacheKey = cacheKey;
  return hosts;
}

export function invalidateScrapeHostCache(): void {
  hostCache = null;
  hostCacheKey = "";
}

export async function createScrapeHost(
  input: z.infer<typeof createHostSchema>,
  actorId: string,
): Promise<ScrapeHostView> {
  const parsed = createHostSchema.parse(input);
  const hostname = normalizeScrapeHostname(parsed.hostname);
  const db = getDb();

  const [created] = await db
    .insert(wikiScrapeHosts)
    .values({
      sportId: parsed.sportId ?? null,
      hostname,
      label: parsed.label.trim(),
      parserProfile: parsed.parserProfile,
      enabled: parsed.enabled,
      createdBy: actorId,
    })
    .returning();

  invalidateScrapeHostCache();
  return mapHost(created!);
}

export async function updateScrapeHost(
  id: string,
  input: z.infer<typeof updateHostSchema>,
): Promise<ScrapeHostView> {
  const parsed = updateHostSchema.parse(input);
  const db = getDb();

  const [updated] = await db
    .update(wikiScrapeHosts)
    .set({
      ...(parsed.label !== undefined ? { label: parsed.label } : {}),
      ...(parsed.parserProfile !== undefined ? { parserProfile: parsed.parserProfile } : {}),
      ...(parsed.enabled !== undefined ? { enabled: parsed.enabled } : {}),
    })
    .where(eq(wikiScrapeHosts.id, id))
    .returning();

  if (!updated) {
    throw new AppError("Scrape host not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  invalidateScrapeHostCache();
  return mapHost(updated);
}

export async function deleteScrapeHost(id: string): Promise<void> {
  const db = getDb();
  const [deleted] = await db
    .delete(wikiScrapeHosts)
    .where(eq(wikiScrapeHosts.id, id))
    .returning({ id: wikiScrapeHosts.id });

  if (!deleted) {
    throw new AppError("Scrape host not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  invalidateScrapeHostCache();
}

export { createHostSchema, updateHostSchema };
