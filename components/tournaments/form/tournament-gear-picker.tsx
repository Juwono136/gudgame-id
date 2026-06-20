"use client";

import { useState } from "react";
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

export function TournamentGearPicker({
  sportSlug,
  selectedIds,
  onChange,
  className,
}: TournamentGearPickerProps) {
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>({});

  const toggle = (gear: GearSearchListItem) => {
    if (selectedIds.includes(gear.id)) {
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
  };

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
            const label = selectedLabels[id] ?? `Gear ${id.slice(0, 8)}…`;
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
                  onClick={() =>
                    toggle({
                      id,
                      displayName: label,
                      slug: "",
                      brand: null,
                      gearCategory: "other",
                      gearCategoryLabel: "Other",
                      priceDisplay: null,
                      primaryImageUrl: null,
                    })
                  }
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      <GearSearchPicker
        sportSlug={sportSlug}
        excludeIds={selectedIds}
        placeholder="Search gear to add…"
        onSelect={toggle}
      />
    </div>
  );
}
