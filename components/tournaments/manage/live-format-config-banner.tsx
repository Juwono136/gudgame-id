"use client";

import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  getTournamentCourtCount,
  getTournamentMatchScoringHint,
  getTournamentPointsPerMatch,
  getMaxRounds,
} from "@/lib/tournaments/settings";
import { getOfficialBillingLabel } from "@/lib/tournaments/ui/labels";
import { isOfficialType } from "@/lib/tournaments/core/types";
import { cn } from "@/lib/utils";

type LiveFormatConfigBannerProps = {
  tournament: TournamentDetail;
  mode: "americano" | "elimination";
  className?: string;
};

export function LiveFormatConfigBanner({
  tournament,
  mode,
  className,
}: LiveFormatConfigBannerProps) {
  const courtCount = getTournamentCourtCount(tournament);
  const matchHint = getTournamentMatchScoringHint(tournament);
  const points = getTournamentPointsPerMatch(tournament);
  const maxRounds = getMaxRounds(tournament);
  const isOfficial = isOfficialType(tournament.tournamentType);

  const chips =
    mode === "americano"
      ? ([
          "Americano · rotating courts",
          matchHint,
          `${courtCount} ${courtCount === 1 ? "court" : "courts"}`,
          maxRounds != null ? `Up to ${maxRounds} rounds` : null,
          "Same-squad partners preferred",
          isOfficial ? getOfficialBillingLabel(tournament.officialBilling) : "Fun match",
          tournament.categoryLabel ?? null,
        ] as const)
      : ([
          "Single elimination",
          matchHint,
          `${courtCount} ${courtCount === 1 ? "court" : "courts"}`,
          `First to ${points}`,
          "Assign ready bracket matches to courts",
          isOfficial ? getOfficialBillingLabel(tournament.officialBilling) : "Fun match",
          tournament.categoryLabel ?? null,
        ] as const);

  const title = mode === "americano" ? "Americano live settings" : "Elimination live settings";

  return (
    <div
      className={cn(
        "rounded-xl border border-cp-border bg-cp-elevated/40 px-3 py-3 sm:px-4",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.filter(Boolean).map((chip) => (
          <span
            key={chip!}
            className="inline-flex rounded-full border border-cp-border bg-cp-card px-2.5 py-1 text-[11px] font-medium text-foreground sm:text-xs"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
