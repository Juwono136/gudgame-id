"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type InvoiceDownloadProgressProps = {
  progress: number;
  label: string;
  className?: string;
};

export function InvoiceDownloadProgress({
  progress,
  label,
  className,
}: InvoiceDownloadProgressProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-cp-border bg-cp-elevated/50 px-4 py-3",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-cp-muted">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2.5" />
    </div>
  );
}
