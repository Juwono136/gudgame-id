"use client";

import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TournamentLiveBannerMatch = {
  id: string;
  courtLabel?: string;
  teamAName: string;
  teamBName: string;
  scoreA?: number | null;
  scoreB?: number | null;
  roundNumber?: number;
  matchNumber?: number;
};

type TournamentLiveBannerProps = {
  matches: TournamentLiveBannerMatch[];
  variant?: "official" | "fun";
  onViewLive: () => void;
  viewLiveLabel?: string;
  className?: string;
};

export function TournamentLiveBanner({
  matches,
  variant = "official",
  onViewLive,
  viewLiveLabel = "View live score",
  className,
}: TournamentLiveBannerProps) {
  if (!matches.length) return null;

  const isOfficial = variant === "official";
  const single = matches.length === 1 ? matches[0]! : null;

  if (single) {
    return (
      <section
        className={cn(
          "border-b",
          isOfficial
            ? "border-cp-primary/30 bg-linear-to-r from-cp-primary/12 via-cp-card to-cp-card"
            : "border-amber-500/30 bg-linear-to-r from-amber-950/50 to-cp-card",
          className,
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <p
              className={cn(
                "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
                isOfficial ? "text-cp-primary" : "text-amber-400",
              )}
            >
              <Radio className="h-4 w-4 animate-pulse" />
              {isOfficial ? "Official live score" : `Live round ${single.roundNumber ?? ""}`}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {single.courtLabel ? `${single.courtLabel}: ` : ""}
              {single.teamAName} vs {single.teamBName}
            </p>
            {single.roundNumber != null ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-cp-muted">
                {single.matchNumber != null
                  ? `Round ${single.roundNumber} · Match ${single.matchNumber}`
                  : `Round ${single.roundNumber}`}
              </p>
            ) : null}
          </div>
          <Button
            variant="outline"
            className={cn(isOfficial ? "border-cp-primary/30 bg-cp-card/70" : "border-amber-500/30")}
            onClick={onViewLive}
          >
            {viewLiveLabel}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "border-b",
        isOfficial
          ? "border-cp-primary/30 bg-linear-to-r from-cp-primary/12 via-cp-card to-cp-card"
          : "border-amber-500/30 bg-linear-to-r from-amber-950/50 to-cp-card",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0">
          <p
            className={cn(
              "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
              isOfficial ? "text-cp-primary" : "text-amber-400",
            )}
          >
            <Radio className="h-4 w-4 animate-pulse" />
            {matches.length} courts live
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-foreground">
            {matches.map((m) => (
              <li key={m.id} className="min-w-0">
                <span className="font-medium text-cp-muted">
                  {m.courtLabel ?? "Court"}:
                </span>{" "}
                {m.teamAName} vs {m.teamBName}
                <span className="ml-1 tabular-nums text-cp-muted">
                  ({m.scoreA ?? 0}:{m.scoreB ?? 0})
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="outline"
          className={cn(isOfficial ? "border-cp-primary/30 bg-cp-card/70" : "border-amber-500/30")}
          onClick={onViewLive}
        >
          {viewLiveLabel}
        </Button>
      </div>
    </section>
  );
}
