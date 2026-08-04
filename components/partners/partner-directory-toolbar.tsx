"use client";

import { Search } from "lucide-react";
import { DirectoryViewToggle } from "@/components/partners/directory-view-toggle";
import { StatusFilterPills } from "@/components/ui/status-filter-pills";
import { SortDirToggle } from "@/components/ui/sort-dir-toggle";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DirectoryViewMode } from "@/hooks/use-directory-view-mode";
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
  viewMode?: DirectoryViewMode;
  onViewModeChange?: (mode: DirectoryViewMode) => void;
  className?: string;
};

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
  viewMode,
  onViewModeChange,
  className,
}: PartnerDirectoryToolbarProps) {
  const showStatus = Boolean(status != null && onStatusChange && statusOptions?.length);
  const showView = Boolean(viewMode && onViewModeChange);

  return (
    <div
      className={cn(
        "rounded-2xl border border-cp-border/80 bg-cp-elevated/25 p-3 shadow-sm sm:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
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
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Sort and layout"
        >
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

          <SortDirToggle value={sortDir} onChange={onSortDirChange} />

          {showView ? (
            <DirectoryViewToggle value={viewMode!} onChange={onViewModeChange!} />
          ) : null}
        </div>
      </div>

      {showStatus ? (
        <StatusFilterPills
          className="mt-3"
          value={status!}
          options={statusOptions!}
          onChange={onStatusChange!}
          ariaLabel="Filter by status"
        />
      ) : null}
    </div>
  );
}
