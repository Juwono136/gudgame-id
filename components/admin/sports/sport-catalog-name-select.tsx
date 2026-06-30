"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { SPORT_CATALOG } from "@/lib/sports/catalog";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

const UNSET_SPORT_VALUE = "__unset__";

type SportCatalogNameSelectProps = {
  value: string;
  onChange: (slug: string, name: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
};

export function SportCatalogNameSelect({
  value,
  onChange,
  disabled,
  error,
  className,
}: SportCatalogNameSelectProps) {
  const { data: provisionedSlugs = [], isLoading } = useQuery({
    queryKey: ["admin", "sports", "provisioned-slugs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sports?view=provisioned-slugs");
      const json = await parseJsonResponse<{
        success: boolean;
        data: { slugs: string[] };
      }>(res);
      if (!res.ok) throw new Error("Failed to load sport catalog");
      return json.data.slugs;
    },
    staleTime: 30_000,
  });

  const available = useMemo(() => {
    const taken = new Set(provisionedSlugs);
    return SPORT_CATALOG.filter((entry) => !taken.has(entry.slug));
  }, [provisionedSlugs]);

  const placeholder = isLoading
    ? "Loading catalog…"
    : available.length === 0
      ? "All catalog sports are provisioned"
      : "Select a sport discipline";

  const selectDisabled = disabled || isLoading || available.length === 0;
  const selectValue = value || UNSET_SPORT_VALUE;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="sport-catalog-select">Sport discipline</Label>
      {isLoading ? (
        <div
          className={cn(
            cpSelectTriggerClass,
            "flex h-11 w-full items-center px-3 text-sm text-cp-muted",
          )}
        >
          Loading catalog…
        </div>
      ) : (
        <Select
          value={selectValue}
          onValueChange={(slug) => {
            if (slug === UNSET_SPORT_VALUE) return;
            const entry = SPORT_CATALOG.find((item) => item.slug === slug);
            if (entry) onChange(entry.slug, entry.name);
          }}
          disabled={selectDisabled}
        >
          <SelectTrigger
            id="sport-catalog-select"
            className={cn(cpSelectTriggerClass, "h-11 w-full")}
            aria-invalid={Boolean(error) || undefined}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent
            position="popper"
            className={cn(cpSelectContentClass, "z-[400] max-h-[min(18rem,50vh)]")}
            sideOffset={4}
          >
            <SelectItem
              value={UNSET_SPORT_VALUE}
              disabled
              className="sr-only"
            >
              Placeholder
            </SelectItem>
            {available.map((entry) => (
              <SelectItem key={entry.slug} value={entry.slug} className={cpSelectItemClass}>
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-[11px] leading-relaxed text-cp-muted">
        Same catalog as &quot;Sports you follow&quot; in player settings — keeps player profiles
        and platform sports in sync.
      </p>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
