"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DirectoryViewMode } from "@/hooks/use-directory-view-mode";
import { cn } from "@/lib/utils";

export function DirectoryViewToggle({
  value,
  onChange,
  className,
}: {
  value: DirectoryViewMode;
  onChange: (mode: DirectoryViewMode) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-xl border border-cp-border bg-cp-card p-0.5",
        className,
      )}
      role="group"
      aria-label="View layout"
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={value === "grid"}
        aria-label="Grid view"
        className={cn(
          "h-9 w-9 rounded-lg px-0",
          value === "grid"
            ? "bg-cp-primary text-white hover:bg-cp-primary-light hover:text-white"
            : "text-cp-muted hover:text-foreground",
        )}
        onClick={() => onChange("grid")}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={value === "list"}
        aria-label="List view"
        className={cn(
          "h-9 w-9 rounded-lg px-0",
          value === "list"
            ? "bg-cp-primary text-white hover:bg-cp-primary-light hover:text-white"
            : "text-cp-muted hover:text-foreground",
        )}
        onClick={() => onChange("list")}
      >
        <List className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
