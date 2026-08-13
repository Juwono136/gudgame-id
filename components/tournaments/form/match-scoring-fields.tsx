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
  type MatchScoringMode,
  defaultMatchScoring,
  getMatchScoringModeLabel,
} from "@/lib/tournaments/match-config";
import { cn } from "@/lib/utils";

type MatchScoringFieldsProps = {
  value: MatchScoringConfig;
  onChange: (value: MatchScoringConfig) => void;
  /** When true, show optional group/knockout overrides. */
  showStageOverrides?: boolean;
  disabled?: boolean;
  className?: string;
};

const MODES: MatchScoringMode[] = ["best_of", "race_to", "total", "custom_score"];

function leafFromMode(mode: MatchScoringMode): MatchScoringConfig {
  switch (mode) {
    case "best_of":
      return { mode: "best_of", bestOf: 3, setTarget: { value: 4 } };
    case "race_to":
      return { mode: "race_to", raceTo: { value: 4 } };
    case "total":
      return { mode: "total", totalSets: 3 };
    case "custom_score":
      return {
        mode: "custom_score",
        customScore: {
          variant: "one_match_winner",
          allowDraw: false,
          tiePolicy: "continue",
        },
      };
    default:
      return defaultMatchScoring();
  }
}

export function MatchScoringFields({
  value,
  onChange,
  showStageOverrides = false,
  disabled,
  className,
}: MatchScoringFieldsProps) {
  const patch = (partial: Partial<MatchScoringConfig>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className={cn("space-y-4 rounded-2xl border border-cp-border bg-cp-elevated/30 p-4", className)}>
      <div>
        <p className="text-sm font-semibold text-foreground">Match scoring</p>
        <p className="mt-1 text-xs leading-relaxed text-cp-muted">
          How a single match or knockout leg is decided. Separate from how many times teams meet.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Scoring mode</Label>
        <Select
          value={value.mode}
          disabled={disabled}
          onValueChange={(mode) => onChange(leafFromMode(mode as MatchScoringMode))}
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
        <div className="grid gap-4 sm:grid-cols-2">
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
            <Label htmlFor="set-target">Set race to</Label>
            <Input
              id="set-target"
              type="number"
              min={1}
              max={99}
              disabled={disabled}
              value={value.setTarget?.value ?? 4}
              onChange={(e) =>
                patch({ setTarget: { value: Math.max(1, Math.floor(Number(e.target.value) || 1)) } })
              }
            />
          </div>
        </div>
      ) : null}

      {value.mode === "race_to" ? (
        <div className="space-y-2">
          <Label htmlFor="race-to">Race to</Label>
          <div className="flex flex-wrap gap-2">
            {[4, 6].map((n) => (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => patch({ raceTo: { value: n } })}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  (value.raceTo?.value ?? 4) === n
                    ? "border-cp-primary bg-cp-primary/10 text-cp-primary"
                    : "border-cp-border bg-cp-card text-cp-muted hover:border-cp-primary/40",
                )}
              >
                First to {n}
              </button>
            ))}
          </div>
          <Input
            id="race-to"
            type="number"
            min={1}
            max={99}
            disabled={disabled}
            value={value.raceTo?.value ?? 4}
            onChange={(e) =>
              patch({ raceTo: { value: Math.max(1, Math.floor(Number(e.target.value) || 1)) } })
            }
          />
        </div>
      ) : null}

      {value.mode === "total" ? (
        <div className="space-y-2">
          <Label htmlFor="total-sets">Total sets</Label>
          <Input
            id="total-sets"
            type="number"
            min={1}
            max={99}
            disabled={disabled}
            value={value.totalSets ?? 3}
            onChange={(e) =>
              patch({ totalSets: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
            }
          />
          <p className="text-[11px] text-cp-muted">All sets are played; most sets won wins.</p>
        </div>
      ) : null}

      {value.mode === "custom_score" ? (
        <div className="grid gap-4 sm:grid-cols-2">
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

      {showStageOverrides ? (
        <p className="text-[11px] text-cp-muted">
          Group and knockout use the same scoring mode for now. Stage-specific overrides can be
          added later without changing existing tournaments.
        </p>
      ) : null}
    </div>
  );
}
