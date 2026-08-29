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
import { BESTIE_CUP_SCORING_SUMMARY } from "@/lib/tournaments/partner/bestie-cup-config";
import {
  gameDeciderLabel,
  type GameDeciderValue,
} from "@/components/tournaments/form/game-decider-fields";
import { cn } from "@/lib/utils";

type OfficialFormatSummaryProps = {
  formatFamily: TournamentFormatFamily;
  format: string;
  rankingMode: TournamentRankingMode;
  allowedTier?: PlayerTierLevel | null;
  matchScoring: MatchScoringConfig;
  customMatch: CustomMatchSettings;
  mexicano?: MexicanoSettings | null;
  /** Modified Swiss uses Bestie Cup pool rules (not Mexicano). */
  modifiedSwiss?: boolean;
  /** Full Bestie Cup Double Stage preset (`poolRules: bestie_cup`). */
  bestieCup?: boolean;
  /** In-game deuce rule (40–40). */
  gameDecider?: GameDeciderValue | null;
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
  modifiedSwiss = false,
  bestieCup = false,
  gameDecider = null,
  className,
}: OfficialFormatSummaryProps) {
  const formatLabel = FORMAT_OPTIONS[format as keyof typeof FORMAT_OPTIONS]?.label ?? format;
  const tierLabel =
    rankingMode === "open"
      ? "No Rank (open)"
      : allowedTier
        ? PLAYER_TIER_LABELS[allowedTier]
        : "—";

  const showBestieRules = bestieCup || modifiedSwiss || format === "modified_swiss";

  const rows: Array<{ label: string; value: string }> = [
    { label: "Match family", value: formatFamily === "custom" ? "Custom" : "Original" },
    { label: "Format", value: formatLabel },
    { label: "Tournament tier", value: tierLabel },
    { label: "Match scoring", value: summarizeMatchScoring(matchScoring) },
  ];

  if (gameDecider) {
    rows.push({
      label: "Deuce (in-game)",
      value: gameDeciderLabel(gameDecider),
    });
  }

  if (format === "double_stage" && (matchScoring.group || matchScoring.knockout)) {
    rows.push({
      label: "Group scoring",
      value: showBestieRules
        ? BESTIE_CUP_SCORING_SUMMARY.pool
        : summarizeMatchScoringLeaf(
            resolveMatchScoringForStage(matchScoring, "group") ?? matchScoring,
          ),
    });
    rows.push({
      label: "Knockout scoring",
      value: showBestieRules
        ? `${BESTIE_CUP_SCORING_SUMMARY.knockoutEarly} · ${BESTIE_CUP_SCORING_SUMMARY.knockoutLate}`
        : summarizeMatchScoringLeaf(
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
  if (showBestieRules) {
    rows.push({
      label: "Pool rules",
      value: "RR meet once · FT6 · wins → GW% → draw",
    });
    rows.push({
      label: "Rest",
      value: "Side change + 1 min at odd game totals",
    });
    if (bestieCup && format === "double_stage") {
      rows.push({
        label: "Knockout (PDF)",
        value: "R16/QF: TB at 5–5 to 7 · SF/Final: win by 2, TB at 6–6 to 7",
      });
    }
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
