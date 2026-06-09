import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function CompetitionListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4 sm:p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl bg-cp-elevated" />
      ))}
    </div>
  );
}

export function CompetitionListFetchingOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-cp-bg/60 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 rounded-xl border border-cp-border bg-cp-card px-4 py-2.5 text-sm text-foreground shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin text-cp-logo-accent" />
        Updating list…
      </div>
    </div>
  );
}
