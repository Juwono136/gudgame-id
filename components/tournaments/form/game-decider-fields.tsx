"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

export type GameDeciderValue = "golden_point" | "star_point" | "advantage";

const OPTIONS: Array<{
  value: GameDeciderValue;
  label: string;
  hint: string;
}> = [
  {
    value: "golden_point",
    label: "Golden Point (No-Ad)",
    hint: "At 40–40, the next point wins the game. Receiving pair chooses side.",
  },
  {
    value: "star_point",
    label: "Star Point",
    hint: "FIP-style: deciding point after repeated deuces (third deuce).",
  },
  {
    value: "advantage",
    label: "Advantage (win by 2)",
    hint: "Classic Ad/Deuce — must win by two points after 40–40.",
  },
];

type GameDeciderFieldsProps = {
  value: GameDeciderValue;
  onChange: (value: GameDeciderValue) => void;
  /** When true, selector is locked (e.g. Bestie Cup PDF requires Golden Point). */
  locked?: boolean;
  lockedHint?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function gameDeciderLabel(value: GameDeciderValue | null | undefined): string {
  return OPTIONS.find((o) => o.value === value)?.label ?? "Golden Point (No-Ad)";
}

export function GameDeciderFields({
  value,
  onChange,
  locked = false,
  lockedHint,
  disabled,
  className,
  id = "game-decider",
}: GameDeciderFieldsProps) {
  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]!;
  const isDisabled = disabled || locked;

  return (
    <div
      className={cn(
        "space-y-2 rounded-2xl border border-cp-border/80 bg-cp-elevated/30 p-4",
        className,
      )}
    >
      <div className="space-y-1">
        <Label htmlFor={id}>Deuce (in-game)</Label>
        <p className="text-xs text-cp-muted">
          How points are decided when a game reaches 40–40. This is separate from
          match race-to / win-by-2 game totals.
        </p>
      </div>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as GameDeciderValue)}
        disabled={isDisabled}
      >
        <SelectTrigger id={id} className={cpSelectTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={cpSelectContentClass}>
          {OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className={cpSelectItemClass}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] leading-relaxed text-cp-muted">{selected.hint}</p>
      {locked && lockedHint ? (
        <p className="text-[11px] font-medium text-cp-primary">{lockedHint}</p>
      ) : null}
    </div>
  );
}
