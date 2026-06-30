"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import { cn } from "@/lib/utils";

type DashboardSportSelectorProps = {
  /** Native select avoids Radix portal issues in mobile drawers */
  preferNative?: boolean;
  className?: string;
};

const UNSET_SPORT_VALUE = "__unset__";

const nativeSelectClass = cn(
  "h-9 w-full appearance-none rounded-lg border border-cp-border bg-cp-bg-input pl-9 pr-8 text-sm text-foreground outline-none",
  "focus-visible:ring-2 focus-visible:ring-cp-primary/40",
);

export function DashboardSportSelector({
  preferNative = false,
  className,
}: DashboardSportSelectorProps) {
  const qc = useQueryClient();
  const { sportSlug, availableSports, setSportSlug } = useDashboardSport();

  const setSport = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch("/api/account/dashboard-sport-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await parseJsonResponse<{ success: boolean; error?: unknown }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to switch sport"));
      }
      return slug;
    },
    onSuccess: (slug) => {
      setSportSlug(slug);
      void qc.invalidateQueries({ queryKey: ["account"] });
      void qc.invalidateQueries({ queryKey: ["host"] });
      toast.success("Active sport updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (availableSports.length === 0) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
          Active sport
        </p>
        <div
          className={cn(
            cpSelectTriggerClass,
            "flex h-9 w-full items-center px-3 text-xs text-cp-muted",
          )}
        >
          No sports available — update Settings
        </div>
      </div>
    );
  }

  const resolvedValue = availableSports.some((sport) => sport.slug === sportSlug)
    ? sportSlug
    : availableSports[0]!.slug;

  if (preferNative) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <label
          htmlFor="dashboard-active-sport"
          className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted"
        >
          Active sport
        </label>
        <div className="relative">
          <Trophy className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-cp-primary" />
          <select
            id="dashboard-active-sport"
            value={resolvedValue}
            disabled={setSport.isPending}
            onChange={(e) => setSport.mutate(e.target.value)}
            className={nativeSelectClass}
          >
            {availableSports.map((sport) => (
              <option key={sport.id} value={sport.slug}>
                {sport.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-cp-muted">
            ▾
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
        Active sport
      </p>
      <Select
        value={resolvedValue || UNSET_SPORT_VALUE}
        onValueChange={(slug) => {
          if (slug !== UNSET_SPORT_VALUE) setSport.mutate(slug);
        }}
        disabled={setSport.isPending}
      >
        <SelectTrigger className={cn(cpSelectTriggerClass, "h-9 w-full text-sm")}>
          <div className="flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-cp-primary" />
            <SelectValue placeholder="Select sport" />
          </div>
        </SelectTrigger>
        <SelectContent
          position="popper"
          className={cn(cpSelectContentClass, "z-[300] max-h-[min(16rem,50vh)]")}
          sideOffset={4}
          collisionPadding={12}
        >
          <SelectItem value={UNSET_SPORT_VALUE} disabled className="sr-only">
            Placeholder
          </SelectItem>
          {availableSports.map((sport) => (
            <SelectItem key={sport.id} value={sport.slug} className={cpSelectItemClass}>
              {sport.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
