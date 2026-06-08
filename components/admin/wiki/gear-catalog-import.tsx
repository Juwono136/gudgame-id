"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Check,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  Package,
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
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filteredItems.map((i) => i.url)));
  };

  const clearSelection = () => setSelected(new Set());

  const runDiscover = async () => {
    if (!catalogUrl.trim()) return;
    setDiscovering(true);
    setDiscovery(null);
    setSelected(new Set());
    try {
      const res = await fetch("/api/admin/wiki-entities/scrape/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: catalogUrl.trim(), sportSlug }),
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

  const importOne = async (url: string) => {
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

    setImporting(true);
    try {
      const batchRes = await fetch("/api/admin/wiki-entities/scrape/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, sportSlug }),
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
          created: { id: number; displayName: string }[];
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

  return (
    <div className="space-y-5 rounded-xl border border-cp-primary/30 bg-cp-card p-5">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-cp-primary" />
          Import from website catalog
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-cp-muted">
          Paste a <strong className="text-slate-300">category, collection, or shop page</strong>{" "}
          URL. Supported hosts include padeltop.id, padelful.com, padelracket.id, and
          decathlon.co.id (HTTPS only). Batch import: up to <strong className="text-slate-300">30</strong>{" "}
          products per run. Extend the allowlist via{" "}
          <code className="text-cp-logo-accent">WIKI_SCRAPE_ALLOWED_HOSTS</code> in .env.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={catalogUrl}
          onChange={(e) => setCatalogUrl(e.target.value)}
          placeholder="https://padeltop.id/collections/..."
          className="border-cp-border bg-cp-elevated"
          disabled={discovering}
        />
        <Button
          type="button"
          onClick={() => void runDiscover()}
          disabled={discovering || !catalogUrl.trim()}
          className="shrink-0 bg-cp-primary hover:bg-cp-primary-light"
        >
          {discovering ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Scan page
        </Button>
      </div>

      {discovery ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4 border-t border-cp-border pt-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-cp-muted">
              Showing {filteredItems.length} of {discovery.totalFound}
              {discovery.truncated ? " (list capped for performance)" : ""}
              · {selected.size} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                Select visible
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>

          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name…"
            className="border-cp-border bg-cp-elevated"
          />

          <div className="max-h-[min(420px,50vh)] overflow-y-auto rounded-lg border border-cp-border">
            <ul className="divide-y divide-cp-border">
              {filteredItems.map((item) => (
                <CatalogRow
                  key={item.url}
                  item={item}
                  checked={selected.has(item.url)}
                  onToggle={() => toggle(item.url)}
                  onImportOne={() => void importOne(item.url)}
                  disabled={scraping || importing}
                />
              ))}
            </ul>
            {filteredItems.length === 0 ? (
              <p className="p-6 text-center text-sm text-cp-muted">No matches.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={importing || selected.size !== 1 || scraping}
              onClick={() => {
                const url = [...selected][0];
                if (url) void importOne(url);
              }}
              className="border-cp-border"
            >
              Edit one before save
            </Button>
            <Button
              type="button"
              disabled={importing || selected.size === 0}
              onClick={() => void importSelectedAsDrafts()}
              className="bg-cp-primary hover:bg-cp-primary-light"
            >
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Package className="mr-2 h-4 w-4" />
              )}
              Import {selected.size} as draft{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

function CatalogRow({
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
    <li className="flex items-center gap-3 p-3 hover:bg-cp-elevated/40">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
          checked ? "border-cp-primary bg-cp-primary text-white" : "border-cp-border",
        )}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
      </button>
      {item.imageUrl ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-cp-elevated">
          <Image src={item.imageUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="h-12 w-12 shrink-0 rounded bg-cp-elevated" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        {item.priceHint ? (
          <p className="text-xs text-cp-logo-accent">{item.priceHint}</p>
        ) : null}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-cp-muted hover:text-cp-primary"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {item.url.replace(/^https?:\/\//, "").slice(0, 48)}…
        </a>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onImportOne}
        className="shrink-0 text-xs"
      >
        Preview
      </Button>
    </li>
  );
}
