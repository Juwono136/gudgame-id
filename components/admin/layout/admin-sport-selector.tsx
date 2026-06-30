"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { useAdminSport } from "@/providers/admin-sport-provider";
import { cn } from "@/lib/utils";

type SportRow = {
  id: string;
  name: string;
  slug: string;
};

type AdminSportSelectorProps = {
  /** Native select avoids Radix portal issues inside mobile drawer */
  preferNative?: boolean;
};

const nativeSelectClass = cn(
  "h-9 w-full appearance-none rounded-lg border border-cp-border bg-cp-bg-input pl-9 pr-8 text-sm text-foreground outline-none",
  "focus-visible:ring-2 focus-visible:ring-cp-primary/40",
);

export function AdminSportSelector({
  preferNative = false,
}: AdminSportSelectorProps) {
  const qc = useQueryClient();
  const { sportSlug, setSportSlug } = useAdminSport();

  const { data: sports = [] } = useQuery({
    queryKey: ["admin", "sports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sports");
      const json = await parseJsonResponse<{ success: boolean; data: SportRow[] }>(
        res,
      );
      if (!res.ok) throw new Error("Failed to load sports");
      return json.data;
    },
  });

  const setSport = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch("/api/admin/sport-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await parseJsonResponse<{ success: boolean }>(res);
      if (!res.ok) throw new Error("Failed to switch sport context");
      return slug;
    },
    onSuccess: (slug) => {
      setSportSlug(slug);
      void qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Sport context updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resolvedValue =
    sports.length > 0
      ? sports.some((s) => s.slug === sportSlug)
        ? sportSlug
        : sports[0]!.slug
      : "";

  if (preferNative) {
    return (
      <div className="space-y-1.5">
        <label
          htmlFor="admin-active-sport"
          className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted"
        >
          Active sport
        </label>
        <div className="relative">
          <Trophy className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-cp-primary" />
          <select
            id="admin-active-sport"
            value={resolvedValue || sportSlug}
            disabled={setSport.isPending || sports.length === 0}
            onChange={(e) => setSport.mutate(e.target.value)}
            className={nativeSelectClass}
          >
            {sports.map((sport) => (
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

  if (!preferNative && sports.length === 0) {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
          Active sport
        </p>
        <div
          className={cn(
            cpSelectTriggerClass,
            "flex h-9 w-full items-center px-3 text-sm text-cp-muted",
          )}
        >
          Loading sports…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
        Active sport
      </p>
      <Select
        value={resolvedValue}
        onValueChange={(slug) => setSport.mutate(slug)}
        disabled={setSport.isPending || sports.length === 0}
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
          {sports.map((sport) => (
            <SelectItem key={sport.id} value={sport.slug} className={cpSelectItemClass}>
              {sport.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
