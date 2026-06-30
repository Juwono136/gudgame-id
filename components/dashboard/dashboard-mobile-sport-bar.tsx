"use client";

import { Trophy } from "lucide-react";
import { DashboardSportSelector } from "@/components/dashboard/dashboard-sport-selector";
import { useDashboardSport } from "@/providers/dashboard-sport-provider";
import { cn } from "@/lib/utils";

/** Compact active-sport switcher for mobile dashboard pages (< lg). */
export function DashboardMobileSportBar() {
  const { availableSports, sportSlug } = useDashboardSport();

  if (availableSports.length <= 1) {
    const label = availableSports.find((s) => s.slug === sportSlug)?.name;
    if (!label) return null;
    return (
      <div className="sticky top-16 z-40 border-b border-cp-border/80 bg-cp-bg/95 px-4 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs text-cp-muted">
          <Trophy className="h-3.5 w-3.5 shrink-0 text-cp-primary" />
          <span>
            Viewing <span className="font-semibold text-foreground">{label}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "sticky top-16 z-40 border-b border-cp-border/80 bg-cp-bg/95 px-4 py-2 backdrop-blur-xl lg:hidden",
      )}
    >
      <div className="mx-auto max-w-7xl">
        <DashboardSportSelector preferNative className="!space-y-1" />
      </div>
    </div>
  );
}
