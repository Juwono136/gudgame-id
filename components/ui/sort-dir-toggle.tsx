"use client";

import { ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SortDirToggle({
  value,
  onChange,
  className,
}: {
  value: "asc" | "desc";
  onChange: (next: "asc" | "desc") => void;
  className?: string;
}) {
  const isDesc = value === "desc";
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-10 shrink-0 gap-2 border-cp-border bg-cp-card px-3 text-foreground",
        className,
      )}
      aria-label={isDesc ? "Sort descending (click for ascending)" : "Sort ascending (click for descending)"}
      title={isDesc ? "Descending — click for ascending" : "Ascending — click for descending"}
      onClick={() => onChange(isDesc ? "asc" : "desc")}
    >
      {isDesc ? (
        <ArrowDownWideNarrow className="h-4 w-4 text-cp-primary" aria-hidden />
      ) : (
        <ArrowUpWideNarrow className="h-4 w-4 text-cp-primary" aria-hidden />
      )}
      <span className="hidden text-sm font-medium sm:inline">{isDesc ? "Desc" : "Asc"}</span>
    </Button>
  );
}
