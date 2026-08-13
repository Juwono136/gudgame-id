"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type MatchScoringConfig,
  type MatchScoringLeaf,
  type MatchScoringMode,
  asMatchScoringLeaf,
  composeDoubleStageMatchScoring,
  getMatchScoringModeLabel,
  matchScoringLeafFromMode,
  normalizeMatchScoringLeaf,
  resolveMatchScoringForStage,
} from "@/lib/tournaments/match-config";
import { cn } from "@/lib/utils";

type MatchScoringFieldsProps = {
  value: MatchScoringConfig;
  onChange: (value: MatchScoringConfig) => void;
  /**
   * Double Stage: independent scoring mode + options for group vs knockout.
   */
  showStageOverrides?: boolean;
  disabled?: boolean;
  className?: string;
};

const MODES: MatchScoringMode[] = ["best_of", "race_to", "total", "custom_score"];
const RACE_PRESETS = [4, 6] as const;

function clampRace(n: number): number {
  return Math.min(99, Math.max(1, Math.floor(n) || 1));
}

function RaceToPicker({
  id,
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {RACE_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              value === n
                ? "border-cp-primary bg-cp-primary/10 text-cp-primary"
                : "border-cp-border bg-cp-card text-cp-muted hover:border-cp-primary/40",
            )}
          >
            First to {n}
          </button>
        ))}
      </div>
      <Input
        id={id}
        type="number"
        min={1}
        max={99}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(clampRace(Number(e.target.value)))}
      />
      {hint ? <p className="text-[11px] text-cp-muted">{hint}</p> : null}
    </div>
  );
}

function ScoringLeafFields({
  idPrefix,
  value,
  disabled,
  onChange,
}: {
  idPrefix: string;
  value: MatchScoringLeaf;
  disabled?: boolean;
  onChange: (next: MatchScoringLeaf) => void;
}) {
  const patch = (partial: Partial<MatchScoringLeaf>) => {
    onChange(normalizeMatchScoringLeaf({ ...value, ...partial }));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Scoring mode</Label>
        <Select
          value={value.mode}
          disabled={disabled}
          onValueChange={(mode) =>
            onChange(matchScoringLeafFromMode(mode as MatchScoringMode))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {getMatchScoringModeLabel(mode)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.mode === "best_of" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Best of</Label>
            <Select
              value={String(value.bestOf ?? 3)}
              disabled={disabled}
              onValueChange={(v) => patch({ bestOf: Number(v) as 3 | 5 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Best of 3</SelectItem>
                <SelectItem value="5">Best of 5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-set-target`}>Set race to</Label>
            <Input
              id={`${idPrefix}-set-target`}
              type="number"
              min={1}
              max={99}
              disabled={disabled}
              value={value.setTarget?.value ?? 4}
              onChange={(e) =>
                patch({ setTarget: { value: clampRace(Number(e.target.value)) } })
              }
            />
          </div>
        </div>
      ) : null}

      {value.mode === "race_to" ? (
        <RaceToPicker
          id={`${idPrefix}-race-to`}
          label="Race to"
          value={value.raceTo?.value ?? 4}
          disabled={disabled}
          onChange={(n) => patch({ raceTo: { value: n } })}
        />
      ) : null}

      {value.mode === "total" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-total-sets`}>Total sets</Label>
          <Input
            id={`${idPrefix}-total-sets`}
            type="number"
            min={1}
            max={99}
            disabled={disabled}
            value={value.totalSets ?? 3}
            onChange={(e) =>
              patch({
                totalSets: Math.max(1, Math.floor(Number(e.target.value) || 1)),
              })
            }
          />
          <p className="text-[11px] text-cp-muted">
            All sets are played; most sets won wins.
          </p>
        </div>
      ) : null}

      {value.mode === "custom_score" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Variant</Label>
            <Select
              value={value.customScore?.variant ?? "one_match_winner"}
              disabled={disabled}
              onValueChange={(variant) =>
                patch({
                  customScore: {
                    variant: variant as "large_score" | "one_match_winner",
                    allowDraw: value.customScore?.allowDraw ?? false,
                    tiePolicy: value.customScore?.tiePolicy ?? "continue",
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_match_winner">One-match winner</SelectItem>
                <SelectItem value="large_score">Large score</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tie policy</Label>
            <Select
              value={value.customScore?.tiePolicy ?? "continue"}
              disabled={disabled}
              onValueChange={(tiePolicy) =>
                patch({
                  customScore: {
                    variant: value.customScore?.variant ?? "one_match_winner",
                    allowDraw: tiePolicy === "allow_draw",
                    tiePolicy: tiePolicy as NonNullable<
                      MatchScoringConfig["customScore"]
                    >["tiePolicy"],
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="continue">Continue (no draw)</SelectItem>
                <SelectItem value="allow_draw">Allow draw</SelectItem>
                <SelectItem value="host_tiebreak">Host tiebreak</SelectItem>
                <SelectItem value="host_manual">Host manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MatchScoringFields({
  value,
  onChange,
  showStageOverrides = false,
  disabled,
  className,
}: MatchScoringFieldsProps) {
  if (showStageOverrides) {
    const groupLeaf = asMatchScoringLeaf(
      resolveMatchScoringForStage(value, "group") ?? value,
    );
    const knockoutLeaf = asMatchScoringLeaf(
      resolveMatchScoringForStage(value, "knockout") ?? {
        mode: "race_to",
        raceTo: { value: 6 },
      },
    );

    return (
      <div
        className={cn(
          "space-y-4 rounded-2xl border border-cp-border bg-cp-elevated/30 p-4",
          className,
        )}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Match scoring</p>
          <p className="mt-1 text-xs leading-relaxed text-cp-muted">
            How a single match or knockout leg is decided. Separate from how many times
            teams meet. Double Stage can use a different scoring type for group vs
            knockout (Best of, Race to, Total, or Custom).
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-cp-border/80 bg-cp-card/40 p-3 sm:p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cp-muted">
              Stage match scoring
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-cp-muted">
              Example: groups Race to 4, knockout Best of 3 — each stage keeps its own
              mode and options.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-cp-border/70 bg-cp-elevated/40 p-3">
              <p className="text-sm font-semibold text-foreground">Group stage</p>
              <p className="text-[11px] text-cp-muted">
                Applied to every group fixture / meeting.
              </p>
              <ScoringLeafFields
                idPrefix="group"
                value={groupLeaf}
                disabled={disabled}
                onChange={(group) =>
                  onChange(composeDoubleStageMatchScoring(group, knockoutLeaf))
                }
              />
            </div>
            <div className="space-y-3 rounded-lg border border-cp-border/70 bg-cp-elevated/40 p-3">
              <p className="text-sm font-semibold text-foreground">Knockout stage</p>
              <p className="text-[11px] text-cp-muted">
                Applied to each knockout leg / bracket slot.
              </p>
              <ScoringLeafFields
                idPrefix="knockout"
                value={knockoutLeaf}
                disabled={disabled}
                onChange={(knockout) =>
                  onChange(composeDoubleStageMatchScoring(groupLeaf, knockout))
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-cp-border bg-cp-elevated/30 p-4",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Match scoring</p>
        <p className="mt-1 text-xs leading-relaxed text-cp-muted">
          How a single match or knockout leg is decided. Separate from how many times
          teams meet.
        </p>
      </div>

      <ScoringLeafFields
        idPrefix="root"
        value={asMatchScoringLeaf(value)}
        disabled={disabled}
        onChange={(leaf) => onChange(leaf)}
      />
    </div>
  );
}
