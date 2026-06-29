"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Package, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { GearSearchPicker } from "@/components/wiki/gear-search-picker";
import type { GearSearchListItem } from "@/lib/wiki/gear/mapper";
import { cn } from "@/lib/utils";

type TournamentGearPickerProps = {
  sportSlug: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
};

async function fetchGearByIds(
  sportSlug: string,
  ids: string[],
): Promise<GearSearchListItem[]> {
  if (!ids.length) return [];
  const params = new URLSearchParams({ sportSlug, ids: ids.join(",") });
  const res = await fetch(`/api/gear/search?${params}`);
  const json = (await res.json()) as { success: boolean; data?: { items: GearSearchListItem[] } };
  return json.data?.items ?? [];
}

export function TournamentGearPicker({
  sportSlug,
  selectedIds,
  onChange,
  className,
}: TournamentGearPickerProps) {
  const [selectedItems, setSelectedItems] = useState<GearSearchListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selectedIds.length) {
        setSelectedItems([]);
        return;
      }
      const items = await fetchGearByIds(sportSlug, selectedIds);
      if (!cancelled) {
        setSelectedItems(items);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sportSlug, selectedIds.join(",")]);

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const add = (gear: GearSearchListItem) => {
    if (selectedIds.includes(gear.id)) return;
    onChange([...selectedIds, gear.id]);
    setSelectedItems((prev) => [...prev, gear]);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label>Approved equipment (from wiki gear)</Label>
        <p className="mt-1 text-xs text-cp-muted">
          Link published gear entries to equipment standards. Search and tap to add approved items.
        </p>
      </div>

      {selectedItems.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {selectedItems.map((item) => (
            <li
              key={item.id}
              className="group relative flex gap-3 rounded-xl border border-cp-border bg-cp-card p-3 shadow-sm transition-colors hover:border-cp-primary/30"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cp-elevated">
                {item.primaryImageUrl ? (
                  <Image
                    src={item.primaryImageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-cp-muted">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <p className="line-clamp-2 text-sm font-semibold text-foreground">
                  {item.displayName}
                </p>
                {item.brand ? (
                  <p className="mt-0.5 text-xs text-cp-muted">{item.brand}</p>
                ) : null}
                <p className="mt-1 text-xs text-cp-primary">{item.gearCategoryLabel}</p>
                {item.priceDisplay ? (
                  <p className="mt-0.5 text-xs font-medium text-foreground">{item.priceDisplay}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="absolute top-2 right-2 rounded-md p-1 text-cp-muted transition-colors hover:bg-red-950/40 hover:text-red-400"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.displayName}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-cp-border px-4 py-6 text-center text-sm text-cp-muted">
          No approved gear linked yet.
        </p>
      )}

      <GearSearchPicker
        sportSlug={sportSlug}
        excludeIds={selectedIds}
        placeholder="Search gear to add…"
        onSelect={add}
      />
    </div>
  );
}
