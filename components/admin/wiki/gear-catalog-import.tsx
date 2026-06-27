"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Package,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import type {
  WikiBatchScrapeResult,
  WikiCatalogDiscovery,
  WikiCatalogListItem,
  WikiScrapePreview,
} from "@/lib/wiki/scrapers/types";
import { cn } from "@/lib/utils";
import { ScrapeHostsManager } from "@/components/admin/wiki/scrape-hosts-manager";
import { normalizeScrapeInputUrl } from "@/lib/wiki/scrapers/normalize-url";
import { WIKI_BATCH_SCRAPE_MAX_URLS } from "@/lib/wiki/scrapers/constants";

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
  const [catalogUrl, setCatalogUrl] = useState("");
  const [discovery, setDiscovery] = useState<WikiCatalogDiscovery | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hostsOpen, setHostsOpen] = useState(false);

  const filteredItems = useMemo(() => {
    if (!discovery) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return discovery.items;
    return discovery.items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q),
    );
  }, [discovery, filter]);

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
        return next;
      }
      if (next.size >= WIKI_BATCH_SCRAPE_MAX_URLS) {
        toast.error(`You can select up to ${WIKI_BATCH_SCRAPE_MAX_URLS} products at a time`, {
          description: "Deselect an item first, or import in smaller batches.",
        });
        return prev;
      }
      next.add(url);
      return next;
    });
  };

  const selectAllVisible = () => {
    const urls = filteredItems.slice(0, WIKI_BATCH_SCRAPE_MAX_URLS).map((i) => i.url);
    setSelected(new Set(urls));
    if (filteredItems.length > WIKI_BATCH_SCRAPE_MAX_URLS) {
      toast.message(`Selected first ${WIKI_BATCH_SCRAPE_MAX_URLS} products`, {
        description: `Batch import is limited to ${WIKI_BATCH_SCRAPE_MAX_URLS} items per run.`,
      });
    }
  };

  const clearSelection = () => setSelected(new Set());

  const runDiscover = async () => {
    const url = normalizeScrapeInputUrl(catalogUrl);
    if (!url.trim()) return;
    setDiscovering(true);
    setDiscovery(null);
    setSelected(new Set());
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
      toast.success("Catalog scanned", {
        description: `Found ${json.data.totalFound} product link${json.data.totalFound === 1 ? "" : "s"}.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  const importOne = async (rawUrl: string) => {
    const url = normalizeScrapeInputUrl(rawUrl);
    setScraping(true);
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
      toast.success("Product loaded", { description: "Review and edit before saving." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setScraping(false);
    }
  };

  const importSelectedAsDrafts = async () => {
    const urls = [...selected];
    if (urls.length === 0) {
      toast.error("Select at least one product");
      return;
    }
    if (urls.length > WIKI_BATCH_SCRAPE_MAX_URLS) {
      toast.error(`You can import up to ${WIKI_BATCH_SCRAPE_MAX_URLS} products at a time`, {
        description: "Deselect some items and try again.",
      });
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
        toast.error("No products could be imported", {
          description: failed[0]?.error,
        });
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
          created: { id: string; displayName: string }[];
          failed: { displayName: string; error: string }[];
        };
      }>(bulkRes);

      toast.success(`Created ${bulkJson.data.created.length} draft(s)`, {
        description:
          failed.length > 0 || bulkJson.data.failed.length > 0
            ? `${failed.length + bulkJson.data.failed.length} item(s) had errors.`
            : undefined,
      });
      onBulkDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk import failed");
    } finally {
      setImporting(false);
    }
  };

  const busy = discovering || scraping || importing;

  return (
    <div className="space-y-4 rounded-xl border border-cp-primary/25 bg-cp-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-cp-primary" />
            Import from website
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-cp-muted">
            Paste a shop or collection URL. Select products (up to {WIKI_BATCH_SCRAPE_MAX_URLS} per
            batch), then import as drafts or open one to edit before publishing.
          </p>
        </div>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              <span className="font-medium">{filteredItems.length}</span>
              <span className="text-cp-muted">
                {" "}
                of {discovery.totalFound} products
                {discovery.truncated ? " (capped)" : ""} · {selected.size} selected
                {selected.size >= WIKI_BATCH_SCRAPE_MAX_URLS
                  ? ` (max ${WIKI_BATCH_SCRAPE_MAX_URLS})`
                  : ""}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                Select all
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>

          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
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
                    onImportOne={() => void importOne(item.url)}
                    disabled={busy}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-cp-border bg-cp-elevated/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-cp-muted">
              {selected.size === 1
                ? "One product selected — open it to review details before saving."
                : selected.size > 1
                  ? `${selected.size} products will be saved as drafts (max ${WIKI_BATCH_SCRAPE_MAX_URLS} per batch).`
                  : "Select products to import."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy || selected.size !== 1}
                onClick={() => {
                  const url = [...selected][0];
                  if (url) void importOne(url);
                }}
                className="border-cp-border"
              >
                Import & edit
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

function CatalogCard({
  item,
  checked,
  onToggle,
  onImportOne,
  disabled,
}: {
  item: WikiCatalogListItem;
  checked: boolean;
  onToggle: () => void;
  onImportOne: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-2.5 transition-colors",
        checked ? "border-cp-primary/60 bg-cp-primary/5" : "border-cp-border bg-cp-card",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          checked ? "border-cp-primary bg-cp-primary text-white" : "border-cp-border",
        )}
        aria-label={checked ? "Deselect" : "Select"}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
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
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {item.title}
        </p>
        {item.priceHint ? (
          <p className="mt-0.5 text-xs text-cp-logo-accent">{item.priceHint}</p>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={onImportOne}
          className="mt-1.5 text-xs font-medium text-cp-primary hover:underline disabled:opacity-50"
        >
          Import & edit
        </button>
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
