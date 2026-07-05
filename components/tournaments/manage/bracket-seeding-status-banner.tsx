"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Lock, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BracketSeedingUiState } from "@/lib/tournaments/brackets/seeding-state";
import {
  cpAlertWarningMutedTextClass,
  cpAlertWarningOutlineButtonClass,
  cpAlertWarningSurfaceClass,
  cpFunAccentTextClass,
  cpOfficialAccentSurfaceClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

type BracketSeedingStatusBannerProps = {
  state: BracketSeedingUiState;
  liveScoringHref?: string;
  onOpenLiveScoring?: () => void;
  variant?: "official" | "fun";
};

export function BracketSeedingStatusBanner({
  state,
  liveScoringHref,
  onOpenLiveScoring,
  variant = "official",
}: BracketSeedingStatusBannerProps) {
  const accent = variant === "official" ? "text-cp-primary" : cpFunAccentTextClass;
  const Icon = state.locked ? Lock : CheckCircle2;

  return (
    <div
      className={cn(
        "mt-5 rounded-xl border px-4 py-3.5 sm:px-5",
        state.locked ? cpAlertWarningSurfaceClass : cpOfficialAccentSurfaceClass,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={cn("flex items-center gap-2 text-sm font-semibold text-foreground", accent)}>
            <Icon className="h-4 w-4 shrink-0" />
            {state.title}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-cp-muted">{state.description}</p>
          {state.locked && state.scoredMatchCount > 0 ? (
            <p className={cn("mt-2 flex items-start gap-1.5 text-xs", cpAlertWarningMutedTextClass)}>
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Walkovers (single-team slots) do not lock seeding — only scored or live matches do.
            </p>
          ) : null}
        </div>
        {state.locked && (onOpenLiveScoring || liveScoringHref) ? (
          onOpenLiveScoring ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("shrink-0", cpAlertWarningOutlineButtonClass)}
              onClick={onOpenLiveScoring}
            >
              <Radio className="mr-2 h-4 w-4" />
              Open Live scoring
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              variant="outline"
              className={cn("shrink-0", cpAlertWarningOutlineButtonClass)}
            >
              <Link href={liveScoringHref!}>
                <Radio className="mr-2 h-4 w-4" />
                Open Live scoring
              </Link>
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
