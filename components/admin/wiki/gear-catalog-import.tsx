"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Package,
  Pencil,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { adminRoutes } from "@/lib/constants/routes";
import type {
  WikiBatchScrapeResult,
  WikiCatalogDiscovery,
  WikiCatalogListItem,
  WikiScrapePreview,
} from "@/lib/wiki/scrapers/types";
import {
  buildGearImportSession,
  clearGearImportSession,
  loadGearImportSession,
  markGearImportProcessed,
  mergeCatalogItemsWithProcessed,
  normalizeCatalogProductUrl,
  pruneProcessedForCatalog,
  saveGearImportSession,
  type GearImportProcessedEntry,
} from "@/lib/wiki/gear-import-session";
import { cn } from "@/lib/utils";
import { ScrapeHostsManager } from "@/components/admin/wiki/scrape-hosts-manager";
import { normalizeScrapeInputUrl } from "@/lib/wiki/scrapers/normalize-url";
import { WIKI_BATCH_SCRAPE_MAX_URLS } from "@/lib/wiki/scrapers/constants";
import { mergeGearImportStatusesFromApi, countImportedCatalogItems } from "@/lib/wiki/fetch-gear-import-status";

type GearCatalogImportProps = {
  sportSlug: string;
  onSelectSingle: (preview: WikiScrapePreview) => void;
  onBulkDone?: () => void;
};

export function GearCatalogImport({
  sportSlug,
  onSelectSingle,
  onBulkDone,
}: GearCatalogImportProps) {
  const router = useRouter();
  const [catalogUrl, setCatalogUrl] = useState("");
  const [discovery, setDiscovery] = useState<WikiCatalogDiscovery | null>(null);
  const [processed, setProcessed] = useState<Record<string, GearImportProcessedEntry>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hostsOpen, setHostsOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [scrapingUrl, setScrapingUrl] = useState<string | null>(null);

  const persistSession = useCallback(
    (
      patch: Partial<{
        catalogUrl: string;
        discovery: WikiCatalogDiscovery | null;
        filter: string;
        selected: Set<string>;
        processed: Record<string, GearImportProcessedEntry>;
      }>,
    ) => {
      const nextDiscovery = patch.discovery ?? discovery;
      if (!nextDiscovery) return;
      saveGearImportSession(
        buildGearImportSession({
          sportSlug,
          catalogUrl: patch.catalogUrl ?? catalogUrl,
          discovery: nextDiscovery,
          filter: patch.filter ?? filter,
          selectedUrls: [...(patch.selected ?? selected)],
          processed: patch.processed ?? processed,
        }),
      );
    },
    [catalogUrl, discovery, filter, processed, selected, sportSlug],
  );

  useEffect(() => {
    let cancelled = false;

    const saved = loadGearImportSession(sportSlug);
    if (saved) {
      setCatalogUrl(saved.catalogUrl);
      setDiscovery(saved.discovery);
      setFilter(saved.filter);
      setSelected(new Set(saved.selectedUrls));
      setProcessed(pruneProcessedForCatalog(saved.discovery, saved.processed));
    } else {
      setCatalogUrl("");
      setDiscovery(null);
      setFilter("");
      setSelected(new Set());
      setProcessed({});
    }
    setSessionReady(true);

    if (!saved) return () => {
      cancelled = true;
    };

    void (async () => {
      try {
        setStatusLoading(true);
        const pruned = pruneProcessedForCatalog(saved.discovery, saved.processed);
        const next = await mergeGearImportStatusesFromApi(
          saved.discovery.items,
          pruned,
        );
        if (cancelled) return;
        setProcessed(next);
        saveGearImportSession(
          buildGearImportSession({
            sportSlug,
            catalogUrl: saved.catalogUrl,
            discovery: saved.discovery,
            filter: saved.filter,
            selectedUrls: saved.selectedUrls,
            processed: next,
          }),
        );
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not refresh import status");
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sportSlug]);

  const filteredItems = useMemo(() => {
    if (!discovery) return [];
    const q = filter.trim().toLowerCase();
    const base = q
      ? discovery.items.filter(
          (i) => i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q),
        )
      : discovery.items;
    return mergeCatalogItemsWithProcessed(base, processed);
  }, [discovery, filter, processed]);

  const importStats = useMemo(
    () => countImportedCatalogItems(filteredItems),
    [filteredItems],
  );

  const importedCount = importStats.uniqueEntities;

  const pendingCount = useMemo(
    () => filteredItems.filter((i) => !i.importStatus).length,
    [filteredItems],
  );

  const toggle = (url: string) => {
    const key = normalizeCatalogProductUrl(url);
    if (processed[key]) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        if (next.size >= WIKI_BATCH_SCRAPE_MAX_URLS) {
          toast.error(`You can select up to ${WIKI_BATCH_SCRAPE_MAX_URLS} products at a time`, {
            description: "Deselect an item first, or import in smaller batches.",
          });
          return prev;
        }
        next.add(url);
      }
      persistSession({ selected: next });
      return next;
    });
  };

  const selectAllVisible = () => {
    const urls = filteredItems
      .filter((i) => !i.importStatus)
      .slice(0, WIKI_BATCH_SCRAPE_MAX_URLS)
      .map((i) => i.url);
    const next = new Set(urls);
    setSelected(next);
    persistSession({ selected: next });
    if (filteredItems.filter((i) => !i.importStatus).length > WIKI_BATCH_SCRAPE_MAX_URLS) {
      toast.message(`Selected first ${WIKI_BATCH_SCRAPE_MAX_URLS} pending products`);
    }
  };

  const clearSelection = () => {
    const next = new Set<string>();
    setSelected(next);
    persistSession({ selected: next });
  };

  const runDiscover = async () => {
    const url = normalizeScrapeInputUrl(catalogUrl);
    if (!url.trim()) return;
    setDiscovering(true);
    setDiscovery(null);
    setSelected(new Set());
    setProcessed({});
    try {
      const res = await fetch("/api/admin/wiki-entities/scrape/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sportSlug }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: WikiCatalogDiscovery;
        error?: { message?: string };
      }>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json, "Discovery failed"));
      setDiscovery(json.data);
      if (json.data.pageType === "product" && json.data.items[0]) {
        setSelected(new Set([json.data.items[0].url]));
      }
      let nextProcessed: Record<string, GearImportProcessedEntry> = {};
      try {
        setStatusLoading(true);
        nextProcessed = await mergeGearImportStatusesFromApi(json.data.items, {});
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not refresh import status");
      } finally {
        setStatusLoading(false);
      }
      setProcessed(nextProcessed);
      saveGearImportSession(
        buildGearImportSession({
          sportSlug,
          catalogUrl: url,
          discovery: json.data,
          filter: "",
          selectedUrls: json.data.pageType === "product" && json.data.items[0] ? [json.data.items[0].url] : [],
          processed: nextProcessed,
        }),
      );
      toast.success("Catalog scanned", {
        description: `Found ${json.data.totalFound} product link${json.data.totalFound === 1 ? "" : "s"}.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  const importOne = async (rawUrl: string, existing?: GearImportProcessedEntry) => {
    if (existing?.entityId) {
      router.push(`${adminRoutes.wikiEntities}/${existing.entityId}/edit`);
      return;
    }

    const url = normalizeScrapeInputUrl(rawUrl);
    setScrapingUrl(rawUrl);
    try {
      const res = await fetch("/api/admin/wiki-entities/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sportSlug }),
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: WikiScrapePreview;
        error?: { message?: string };
      }>(res);
      if (!res.ok) throw new Error(extractApiErrorMessage(json, "Import failed"));
      onSelectSingle(json.data);
      toast.success("Product loaded", { description: "Review and save — you'll return here for the next item." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setScrapingUrl(null);
    }
  };

  const importSelectedAsDrafts = async () => {
    const urls = [...selected].filter((u) => !processed[normalizeCatalogProductUrl(u)]);
    if (urls.length === 0) {
      toast.error("Select at least one product that is not already imported");
      return;
    }
    if (urls.length > WIKI_BATCH_SCRAPE_MAX_URLS) {
      toast.error(`You can import up to ${WIKI_BATCH_SCRAPE_MAX_URLS} products at a time`);
      return;
    }

    setImporting(true);
    try {
      const batchRes = await fetch("/api/admin/wiki-entities/scrape/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: urls.map((u) => normalizeScrapeInputUrl(u)),
          sportSlug,
        }),
      });
      const batchJson = await parseJsonResponse<{
        success: boolean;
        data: WikiBatchScrapeResult;
        error?: { message?: string };
      }>(batchRes);
      if (!batchRes.ok) {
        throw new Error(extractApiErrorMessage(batchJson, "Batch scrape failed"));
      }

      const { succeeded, failed } = batchJson.data;
      if (succeeded.length === 0) {
        toast.error("No products could be imported", { description: failed[0]?.error });
        return;
      }

      const bulkRes = await fetch("/api/admin/wiki-entities/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: succeeded.map((p) => ({
            sourceUrl: p.sourceUrl,
            displayName: p.displayName,
            summary: p.summary,
            primaryImageUrl: p.primaryImageUrl ?? "",
            attributes: p.attributes,
            performance: p.performance,
            specs: p.specs,
          })),
          publish: false,
        }),
      });
      const bulkJson = await parseJsonResponse<{
        success: boolean;
        data: {
          created: { id: string; displayName: string; slug: string }[];
          failed: { displayName: string; error: string }[];
        };
        error?: unknown;
      }>(bulkRes);
      if (!bulkRes.ok) {
        throw new Error(extractApiErrorMessage(bulkJson, "Bulk import failed"));
      }

      const nextProcessed = { ...processed };
      for (const created of bulkJson.data.created) {
        const match = succeeded.find((p) => p.displayName === created.displayName);
        if (!match) continue;
        const key = normalizeCatalogProductUrl(match.sourceUrl);
        nextProcessed[key] = {
          sourceUrl: key,
          entityId: created.id,
          displayName: created.displayName,
          status: "draft",
          updatedAt: new Date().toISOString(),
        };
      }
      setProcessed(nextProcessed);
      setSelected(new Set());
      persistSession({ processed: nextProcessed, selected: new Set() });

      toast.success(`Created ${bulkJson.data.created.length} draft(s)`, {
        description:
          failed.length > 0 || bulkJson.data.failed.length > 0
            ? `${failed.length + bulkJson.data.failed.length} item(s) had errors.`
            : "Marked as imported in this session.",
      });
      onBulkDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk import failed");
    } finally {
      setImporting(false);
    }
  };

  const busy = discovering || importing;

  return (
    <div className="space-y-4 rounded-xl border border-cp-primary/25 bg-cp-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-cp-primary" />
            Import from website
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-cp-muted">
            Scan a catalog once, then import and edit products one by one. Imported items stay
            marked in this session so you never lose progress or create duplicates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {discovery ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-cp-border text-xs"
              onClick={() => {
                clearGearImportSession(sportSlug);
                setDiscovery(null);
                setCatalogUrl("");
                setFilter("");
                setSelected(new Set());
                setProcessed({});
              }}
            >
              Clear session
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-cp-border text-xs"
            onClick={() => setHostsOpen((o) => !o)}
          >
            <ChevronDown
              className={cn("mr-1.5 h-3.5 w-3.5 transition-transform", hostsOpen && "rotate-180")}
            />
            Allowed hosts
          </Button>
        </div>
      </div>

      {hostsOpen ? (
        <div className="rounded-lg border border-cp-border bg-cp-elevated/40 p-3">
          <ScrapeHostsManager />
        </div>
      ) : null}

      <div className="rounded-lg border border-cp-border bg-cp-elevated/30 p-3 sm:p-4">
        <label className="text-xs font-medium text-cp-muted">Catalog or collection URL</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            value={catalogUrl}
            onChange={(e) => setCatalogUrl(e.target.value)}
            placeholder="https://padeltop.id/collections/rackets"
            className="border-cp-border bg-cp-elevated"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runDiscover();
            }}
          />
          <Button
            type="button"
            onClick={() => void runDiscover()}
            disabled={busy || !catalogUrl.trim()}
            className="shrink-0 bg-cp-primary hover:bg-cp-primary-light"
          >
            {discovering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Scan
          </Button>
        </div>
      </div>

      {discovery ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-cp-border bg-cp-elevated/30 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">Found</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{discovery.totalFound}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
                Imported
              </p>
              <p className="mt-0.5 text-lg font-bold text-emerald-200">{importedCount}</p>
              {importStats.linkedCards > importStats.uniqueEntities ? (
                <p className="mt-0.5 text-[10px] text-emerald-300/70">
                  {importStats.linkedCards} cards linked
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-cp-border bg-cp-elevated/30 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">Pending</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{pendingCount}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              <span className="font-medium">{filteredItems.length}</span>
              <span className="text-cp-muted">
                {" "}
                shown · {selected.size} selected
                {statusLoading ? " · syncing status…" : ""}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                Select pending
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>

          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              persistSession({ filter: e.target.value });
            }}
            placeholder="Search products…"
            className="border-cp-border bg-cp-elevated"
          />

          <div className="max-h-[min(440px,55vh)] overflow-y-auto rounded-lg border border-cp-border p-2 sm:p-3">
            {filteredItems.length === 0 ? (
              <p className="p-8 text-center text-sm text-cp-muted">No matches.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                  <CatalogCard
                    key={item.url}
                    item={item}
                    checked={selected.has(item.url)}
                    onToggle={() => toggle(item.url)}
                    onImportOne={() => void importOne(item.url, item.importStatus)}
                    disabled={busy}
                    importing={scrapingUrl === item.url}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-cp-border bg-cp-elevated/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-cp-muted">
              Use <strong className="text-foreground">Import & edit</strong> on each card to work
              through products one at a time. After saving, you return here automatically.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy || selected.size !== 1 || Boolean(
                  selected.size === 1 &&
                    processed[normalizeCatalogProductUrl([...selected][0] ?? "")],
                )}
                onClick={() => {
                  const url = [...selected][0];
                  if (url) void importOne(url);
                }}
                className="border-cp-border"
              >
                Import & edit selected
              </Button>
              <Button
                type="button"
                disabled={busy || selected.size === 0}
                onClick={() => void importSelectedAsDrafts()}
                className="bg-cp-primary hover:bg-cp-primary-light"
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                Save {selected.size} as draft{selected.size === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

function ImportStatusBadge({ status }: { status: string }) {
  const label = status === "published" ? "Published" : status === "archived" ? "Archived" : "Draft";
  const className =
    status === "published"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "archived"
        ? "border-cp-border bg-cp-elevated text-cp-muted"
        : "border-sky-500/30 bg-sky-500/10 text-sky-200";

  return (
    <Badge className={cn("border text-[10px] font-semibold uppercase", className)}>
      <CheckCircle2 className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

function CatalogCard({
  item,
  checked,
  onToggle,
  onImportOne,
  disabled,
  importing = false,
}: {
  item: WikiCatalogListItem & { importStatus?: GearImportProcessedEntry };
  checked: boolean;
  onToggle: () => void;
  onImportOne: () => void;
  disabled: boolean;
  importing?: boolean;
}) {
  const imported = Boolean(item.importStatus);

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-2.5 transition-colors",
        imported
          ? "border-emerald-500/35 bg-emerald-500/5"
          : checked
            ? "border-cp-primary/60 bg-cp-primary/5"
            : "border-cp-border bg-cp-card",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || imported}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          imported
            ? "cursor-not-allowed border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
            : checked
              ? "border-cp-primary bg-cp-primary text-white"
              : "border-cp-border",
        )}
        aria-label={imported ? "Already imported" : checked ? "Deselect" : "Select"}
      >
        {imported ? <Check className="h-3 w-3" /> : checked ? <Check className="h-3 w-3" /> : null}
      </button>
      {item.imageUrl ? (
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-cp-elevated">
          <Image src={item.imageUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-cp-elevated text-[10px] text-cp-muted">
          No img
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-1.5">
          <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug text-foreground">
            {item.title}
          </p>
          {item.importStatus ? (
            <ImportStatusBadge status={item.importStatus.status} />
          ) : null}
        </div>
        {item.priceHint ? (
          <p className="mt-0.5 text-xs text-cp-logo-accent">{item.priceHint}</p>
        ) : null}
        {item.importStatus ? (
          <div className="mt-2 space-y-1">
            <p className="line-clamp-1 text-[11px] text-cp-muted">
              Saved as {item.importStatus.displayName}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              asChild
            >
              <Link href={`${adminRoutes.wikiEntities}/${item.importStatus.entityId}/edit`}>
                <Pencil className="mr-1 h-3 w-3" />
                Edit entity
              </Link>
            </Button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || importing}
            onClick={onImportOne}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-cp-primary hover:underline disabled:opacity-50"
          >
            {importing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading…
              </>
            ) : (
              "Import & edit"
            )}
          </button>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-cp-muted hover:text-cp-primary"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          Source
        </a>
      </div>
    </div>
  );
}

/** Called from wizard after a catalog import is saved — updates session markers. */
export { markGearImportProcessed };
