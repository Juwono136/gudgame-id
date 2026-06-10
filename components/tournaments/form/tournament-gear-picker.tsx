"use client";

import { useState } from "react";
import { Loader2, Package, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

type GearOption = {
  id: number;
  displayName: string;
  slug: string;
};

type TournamentGearPickerProps = {
  sportSlug: string;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  className?: string;
};

export function TournamentGearPicker({
  sportSlug,
  selectedIds,
  onChange,
  className,
}: TournamentGearPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<Record<number, string>>({});
  const debouncedSearch = useDebounce(search, 400);

  const { data, isFetching } = useQuery({
    queryKey: ["tournament", "gear-search", sportSlug, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedSearch,
        sportSlug,
      });
      const res = await fetch(`/api/tournaments/gear-search?${params}`);
      const json = await parseJsonResponse<{
        success: boolean;
        data: { items: GearOption[] };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Gear search failed"));
      }
      return json.data?.items ?? [];
    },
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30_000,
  });

  const selectedSet = new Set(selectedIds);

  const toggle = (gear: GearOption) => {
    if (selectedSet.has(gear.id)) {
      onChange(selectedIds.filter((x) => x !== gear.id));
      setSelectedLabels((prev) => {
        const next = { ...prev };
        delete next[gear.id];
        return next;
      });
    } else {
      onChange([...selectedIds, gear.id]);
      setSelectedLabels((prev) => ({ ...prev, [gear.id]: gear.displayName }));
    }
    setSearch("");
  };

  const visibleResults = data?.filter((g) => !selectedSet.has(g.id)) ?? [];

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <Label>Approved equipment (from wiki gear)</Label>
        <p className="mt-1 text-xs text-cp-muted">
          Link published gear entries to equipment standards. Type at least 2 characters to
          search.
        </p>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const label =
              selectedLabels[id] ??
              data?.find((g) => g.id === id)?.displayName ??
              `Gear #${id}`;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-cp-border bg-cp-elevated px-2.5 py-1 text-xs text-foreground"
              >
                <Package className="h-3 w-3 text-cp-primary" />
                {label}
                <button
                  type="button"
                  className="text-cp-muted hover:text-red-400"
                  onClick={() => toggle({ id, displayName: label, slug: "" })}
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gear to add…"
          className="border-cp-border bg-cp-bg-input pl-9"
        />
      </div>

      {isFetching ? (
        <div className="flex items-center gap-2 text-xs text-cp-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching gear…
        </div>
      ) : null}

      {debouncedSearch.trim().length >= 2 && !isFetching ? (
        visibleResults.length > 0 ? (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-cp-border p-2">
            {visibleResults.map((gear) => (
              <li key={gear.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start text-left"
                  onClick={() => toggle(gear)}
                >
                  <Package className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{gear.displayName}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-cp-muted">No published gear matches your search.</p>
        )
      ) : search.trim().length > 0 && search.trim().length < 2 ? (
        <p className="text-xs text-cp-muted">Type at least 2 characters to search.</p>
      ) : null}
    </div>
  );
}
