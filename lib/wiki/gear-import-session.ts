import type {
  WikiCatalogDiscovery,
  WikiCatalogListItem,
} from "@/lib/wiki/scrapers/types";
import { normalizeWikiSourceUrl } from "@/lib/wiki/normalize-source-url";

export type GearImportProcessedEntry = {
  sourceUrl: string;
  entityId: string;
  displayName: string;
  status: string;
  updatedAt: string;
};

export type GearCatalogImportSession = {
  sportSlug: string;
  catalogUrl: string;
  discovery: WikiCatalogDiscovery;
  filter: string;
  selectedUrls: string[];
  processed: Record<string, GearImportProcessedEntry>;
  savedAt: string;
};

const SESSION_VERSION = 1;
const SESSION_KEY_PREFIX = "tb-gear-import-session";

function sessionKey(sportSlug: string): string {
  return `${SESSION_KEY_PREFIX}:${sportSlug}:v${SESSION_VERSION}`;
}

export function normalizeCatalogProductUrl(url: string): string {
  return normalizeWikiSourceUrl(url);
}

export function loadGearImportSession(sportSlug: string): GearCatalogImportSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(sportSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GearCatalogImportSession;
    if (parsed.sportSlug !== sportSlug || !parsed.discovery?.items?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGearImportSession(session: GearCatalogImportSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      sessionKey(session.sportSlug),
      JSON.stringify({ ...session, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota exceeded — non-fatal */
  }
}

export function clearGearImportSession(sportSlug: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(sessionKey(sportSlug));
}

export function markGearImportProcessed(
  sportSlug: string,
  sourceUrl: string,
  entry: Omit<GearImportProcessedEntry, "sourceUrl" | "updatedAt">,
): GearCatalogImportSession | null {
  const existing = loadGearImportSession(sportSlug);
  if (!existing) return null;

  const key = normalizeCatalogProductUrl(sourceUrl);
  const next: GearCatalogImportSession = {
    ...existing,
    processed: {
      ...existing.processed,
      [key]: {
        sourceUrl: key,
        ...entry,
        updatedAt: new Date().toISOString(),
      },
    },
    selectedUrls: existing.selectedUrls.filter((u) => normalizeCatalogProductUrl(u) !== key),
  };
  saveGearImportSession(next);
  return next;
}

export function buildGearImportSession(input: {
  sportSlug: string;
  catalogUrl: string;
  discovery: WikiCatalogDiscovery;
  filter?: string;
  selectedUrls?: Iterable<string>;
  processed?: Record<string, GearImportProcessedEntry>;
}): GearCatalogImportSession {
  return {
    sportSlug: input.sportSlug,
    catalogUrl: input.catalogUrl,
    discovery: input.discovery,
    filter: input.filter ?? "",
    selectedUrls: [...(input.selectedUrls ?? [])],
    processed: input.processed ?? {},
    savedAt: new Date().toISOString(),
  };
}

export function mergeCatalogItemsWithProcessed(
  items: WikiCatalogListItem[],
  processed: Record<string, GearImportProcessedEntry>,
): (WikiCatalogListItem & { importStatus?: GearImportProcessedEntry })[] {
  return items.map((item) => {
    const key = normalizeCatalogProductUrl(item.url);
    const importStatus = processed[key];
    return importStatus ? { ...item, importStatus } : item;
  });
}

/** Keep only processed entries that belong to the current catalog scan. */
export function pruneProcessedForCatalog(
  discovery: WikiCatalogDiscovery,
  processed: Record<string, GearImportProcessedEntry>,
): Record<string, GearImportProcessedEntry> {
  const catalogKeys = new Set(discovery.items.map((item) => normalizeCatalogProductUrl(item.url)));
  const next: Record<string, GearImportProcessedEntry> = {};
  for (const [key, entry] of Object.entries(processed)) {
    if (catalogKeys.has(key)) {
      next[key] = entry;
    }
  }
  return next;
}
