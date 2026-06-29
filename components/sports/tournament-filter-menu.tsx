"use client";

import { useMemo, useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OFFICIAL_BILLING_LABELS } from "@/lib/tournaments/ui/labels";
import type { PublicTournamentsListQuery } from "@/lib/validations/tournaments";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

export type TournamentFilterState = {
  bucket: PublicTournamentsListQuery["bucket"];
  type: PublicTournamentsListQuery["type"];
  officialBilling: NonNullable<PublicTournamentsListQuery["officialBilling"]>;
  format: NonNullable<PublicTournamentsListQuery["format"]>;
  category: NonNullable<PublicTournamentsListQuery["category"]>;
  sortBy: PublicTournamentsListQuery["sortBy"];
  sortDir: PublicTournamentsListQuery["sortDir"];
};

const DEFAULT_FILTER: TournamentFilterState = {
  bucket: "all",
  type: "all",
  officialBilling: "all",
  format: "all",
  category: "all",
  sortBy: "startsAt",
  sortDir: "desc",
};

type TournamentFilterMenuProps = {
  value: TournamentFilterState;
  onChange: (next: TournamentFilterState) => void;
  className?: string;
};

function countActiveFilters(value: TournamentFilterState): number {
  let n = 0;
  if (value.bucket !== "all") n++;
  if (value.type !== "all") n++;
  if (value.officialBilling !== "all") n++;
  if (value.format !== "all") n++;
  if (value.category !== "all") n++;
  if (value.sortBy !== "startsAt" || value.sortDir !== "desc") n++;
  return n;
}

export function TournamentFilterMenu({ value, onChange, className }: TournamentFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TournamentFilterState>(value);
  const activeCount = useMemo(() => countActiveFilters(value), [value]);
  const showBilling = draft.type === "all" || draft.type === "official";

  const openDialog = (next: boolean) => {
    if (next) setDraft(value);
    setOpen(next);
  };

  const patch = (partial: Partial<TournamentFilterState>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const clearAll = () => {
    setDraft(DEFAULT_FILTER);
    onChange(DEFAULT_FILTER);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-10 w-full gap-2 sm:h-11 sm:w-auto", className)}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 ? (
            <Badge className="ml-1 h-5 min-w-5 border-0 bg-cp-primary px-1.5 text-[10px] text-white">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter tournaments</DialogTitle>
          <DialogDescription>
            Refine the list by status, type, format, and more. Changes apply when you tap Apply.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <FilterGroup label="Status">
            <Select
              modal={false}
              value={draft.bucket}
              onValueChange={(v) => patch({ bucket: v as TournamentFilterState["bucket"] })}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="all" className={cpSelectItemClass}>All</SelectItem>
                <SelectItem value="live" className={cpSelectItemClass}>Live</SelectItem>
                <SelectItem value="upcoming" className={cpSelectItemClass}>Upcoming</SelectItem>
                <SelectItem value="past" className={cpSelectItemClass}>Past</SelectItem>
              </SelectContent>
            </Select>
          </FilterGroup>

          <FilterGroup label="Type">
            <Select
              modal={false}
              value={draft.type}
              onValueChange={(v) =>
                patch({
                  type: v as TournamentFilterState["type"],
                  officialBilling: v === "fun_match" ? "all" : draft.officialBilling,
                })
              }
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="all" className={cpSelectItemClass}>All</SelectItem>
                <SelectItem value="official" className={cpSelectItemClass}>Official</SelectItem>
                <SelectItem value="fun_match" className={cpSelectItemClass}>Fun Match</SelectItem>
              </SelectContent>
            </Select>
          </FilterGroup>

          {showBilling ? (
            <FilterGroup label="Billing">
              <Select
                modal={false}
                value={draft.officialBilling}
                onValueChange={(v) =>
                  patch({ officialBilling: v as TournamentFilterState["officialBilling"] })
                }
              >
                <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass} position="popper">
                  <SelectItem value="all" className={cpSelectItemClass}>All</SelectItem>
                  <SelectItem value="paid" className={cpSelectItemClass}>
                    {OFFICIAL_BILLING_LABELS.paid}
                  </SelectItem>
                  <SelectItem value="free" className={cpSelectItemClass}>
                    {OFFICIAL_BILLING_LABELS.free}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FilterGroup>
          ) : null}

          <FilterGroup label="Format">
            <Select
              modal={false}
              value={draft.format}
              onValueChange={(v) => patch({ format: v as TournamentFilterState["format"] })}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="all" className={cpSelectItemClass}>All</SelectItem>
                <SelectItem value="americano" className={cpSelectItemClass}>Americano</SelectItem>
                <SelectItem value="single_elimination" className={cpSelectItemClass}>Elimination</SelectItem>
              </SelectContent>
            </Select>
          </FilterGroup>

          <FilterGroup label="Category">
            <Select
              modal={false}
              value={draft.category}
              onValueChange={(v) => patch({ category: v as TournamentFilterState["category"] })}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="all" className={cpSelectItemClass}>All</SelectItem>
                <SelectItem value="Male" className={cpSelectItemClass}>Male</SelectItem>
                <SelectItem value="Female" className={cpSelectItemClass}>Female</SelectItem>
                <SelectItem value="Mix" className={cpSelectItemClass}>Mix</SelectItem>
              </SelectContent>
            </Select>
          </FilterGroup>

          <FilterGroup label="Sort">
            <Select
              modal={false}
              value={`${draft.sortBy}-${draft.sortDir}`}
              onValueChange={(v) => {
                const [sortBy, sortDir] = v.split("-") as [
                  TournamentFilterState["sortBy"],
                  TournamentFilterState["sortDir"],
                ];
                patch({ sortBy, sortDir });
              }}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass} position="popper">
                <SelectItem value="startsAt-desc" className={cpSelectItemClass}>Date (newest)</SelectItem>
                <SelectItem value="startsAt-asc" className={cpSelectItemClass}>Date (oldest)</SelectItem>
                <SelectItem value="name-asc" className={cpSelectItemClass}>Name (A–Z)</SelectItem>
                <SelectItem value="updated-desc" className={cpSelectItemClass}>Recently updated</SelectItem>
              </SelectContent>
            </Select>
          </FilterGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={clearAll}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button type="button" onClick={apply}>
            Apply filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-cp-muted">{label}</Label>
      {children}
    </div>
  );
}
