"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

export type PartnerDirectorySelectOption = {
  value: string;
  label: string;
};

type PartnerDirectoryToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: PartnerDirectorySelectOption[];
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOptions: PartnerDirectorySelectOption[];
  sortDir: "asc" | "desc";
  onSortDirChange: (value: "asc" | "desc") => void;
  className?: string;
};

/** Avoid `w-full` from cpSelectTriggerClass stacking filters vertically. */
const triggerClass = cn(
  cpSelectTriggerClass,
  "h-10 w-full min-w-0 bg-cp-card sm:w-[11rem] md:w-[10.5rem] lg:w-[11.5rem]",
);

export function PartnerDirectoryToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  status,
  onStatusChange,
  statusOptions,
  sortBy,
  onSortByChange,
  sortOptions,
  sortDir,
  onSortDirChange,
  className,
}: PartnerDirectoryToolbarProps) {
  const showStatus = Boolean(status != null && onStatusChange && statusOptions?.length);

  return (
    <div
      className={cn(
        "rounded-2xl border border-cp-border/80 bg-cp-elevated/25 p-3 shadow-sm sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 border-cp-border bg-cp-card pl-9"
            aria-label="Search"
          />
        </div>

        <div
          className={cn(
            "grid gap-2",
            showStatus ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2",
            "xl:flex xl:shrink-0 xl:flex-nowrap xl:items-center",
          )}
          role="group"
          aria-label="Filter and sort"
        >
          {showStatus ? (
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className={triggerClass} aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass}>
                {statusOptions!.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={cpSelectItemClass}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className={triggerClass} aria-label="Sort by">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className={cpSelectContentClass}>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={cpSelectItemClass}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortDir} onValueChange={(v) => onSortDirChange(v as "asc" | "desc")}>
            <SelectTrigger
              className={cn(triggerClass, "sm:w-[10rem] lg:w-[10.5rem]")}
              aria-label="Sort direction"
            >
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent className={cpSelectContentClass}>
              <SelectItem value="desc" className={cpSelectItemClass}>
                Descending
              </SelectItem>
              <SelectItem value="asc" className={cpSelectItemClass}>
                Ascending
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
