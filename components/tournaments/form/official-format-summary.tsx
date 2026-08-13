"use client";

import {
  formatHasGroupStage,
  formatHasKnockout,
  resolveMatchScoringForStage,
  summarizeMatchScoring,
  summarizeMatchScoringLeaf,
  type CustomMatchSettings,
  type MatchScoringConfig,
  type MexicanoSettings,
  type TournamentFormatFamily,
  type TournamentRankingMode,
} from "@/lib/tournaments/match-config";
import { FORMAT_OPTIONS } from "@/lib/tournaments/form/format-options";
import { PLAYER_TIER_LABELS, type PlayerTierLevel } from "@/lib/player/tier";
import { cn } from "@/lib/utils";

type OfficialFormatSummaryProps = {
  formatFamily: TournamentFormatFamily;
  format: string;
  rankingMode: TournamentRankingMode;
  allowedTier?: PlayerTierLevel | null;
  matchScoring: MatchScoringConfig;
  customMatch: CustomMatchSettings;
  mexicano?: MexicanoSettings | null;
  className?: string;
};

export function OfficialFormatSummary({
  formatFamily,
  format,
  rankingMode,
  allowedTier,
  matchScoring,
  customMatch,
  mexicano,
  className,
}: OfficialFormatSummaryProps) {
  const formatLabel = FORMAT_OPTIONS[format as keyof typeof FORMAT_OPTIONS]?.label ?? format;
  const tierLabel =
    rankingMode === "open"
      ? "No Rank (open)"
      : allowedTier
        ? PLAYER_TIER_LABELS[allowedTier]
        : "—";

  const rows: Array<{ label: string; value: string }> = [
    { label: "Match family", value: formatFamily === "custom" ? "Custom" : "Original" },
    { label: "Format", value: formatLabel },
    { label: "Tournament tier", value: tierLabel },
    { label: "Match scoring", value: summarizeMatchScoring(matchScoring) },
  ];

  if (format === "double_stage" && (matchScoring.group || matchScoring.knockout)) {
    rows.push({
      label: "Group scoring",
      value: summarizeMatchScoringLeaf(
        resolveMatchScoringForStage(matchScoring, "group") ?? matchScoring,
      ),
    });
    rows.push({
      label: "Knockout scoring",
      value: summarizeMatchScoringLeaf(
        resolveMatchScoringForStage(matchScoring, "knockout") ?? matchScoring,
      ),
    });
  }

  if (formatFamily === "custom" && formatHasGroupStage(format)) {
    rows.push({
      label: "Group meetings / pair",
      value: String(customMatch.groupMeetingsPerPair),
    });
  }
  if (formatFamily === "custom" && formatHasKnockout(format)) {
    rows.push({
      label: "Knockout legs / slot",
      value: String(customMatch.knockoutLegsPerSlot),
    });
  }
  if (format === "mexicano" && mexicano) {
    rows.push({
      label: "Mexicano",
      value: `${mexicano.mode === "individual" ? "Individual" : "Team"} · ${mexicano.roundCount} rounds`,
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-cp-border bg-cp-elevated/40 p-4",
        className,
      )}
    >
      <p className="text-sm font-semibold text-foreground">Structured match rules</p>
      <p className="mt-1 text-xs text-cp-muted">
        Generated from your selections in Basics. Optional notes below can add host remarks only.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-cp-border/60 bg-cp-card/60 px-3 py-2"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
              {row.label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
