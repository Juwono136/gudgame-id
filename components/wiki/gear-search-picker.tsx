"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGearSearch } from "@/hooks/use-gear-search";
import type { GearSearchListItem } from "@/lib/wiki/gear/mapper";
import { cn } from "@/lib/utils";

type GearSearchPickerProps = {
  sportSlug: string;
  onSelect: (item: GearSearchListItem) => void;
  excludeIds?: string[];
  placeholder?: string;
  className?: string;
};

export function GearSearchPicker({
  sportSlug,
  onSelect,
  excludeIds = [],
  placeholder = "Search catalog gear…",
  className,
}: GearSearchPickerProps) {
  const [search, setSearch] = useState("");
  const { data, isFetching } = useGearSearch(sportSlug, search);
  const excluded = new Set(excludeIds);
  const results = data?.filter((item) => !excluded.has(item.id)) ?? [];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="border-cp-border bg-cp-bg-input pl-9"
        />
      </div>

      {isFetching ? (
        <div className="flex items-center gap-2 text-xs text-cp-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Searching…
        </div>
      ) : null}

      {search.trim().length >= 2 && !isFetching ? (
        results.length > 0 ? (
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-cp-border p-2">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-cp-elevated"
                  onClick={() => {
                    onSelect(item);
                    setSearch("");
                  }}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-cp-border bg-cp-elevated">
                    {item.primaryImageUrl ? (
                      <Image
                        src={item.primaryImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-cp-muted" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.displayName}
                    </p>
                    <p className="truncate text-xs text-cp-muted">
                      {[item.brand, item.gearCategoryLabel, item.priceDisplay]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </button>
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
