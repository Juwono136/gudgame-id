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
  MEXICANO_ROUNDS_MAX,
  MEXICANO_ROUNDS_MIN,
  type MexicanoSettings,
} from "@/lib/tournaments/match-config";
import { cn } from "@/lib/utils";

type MexicanoSettingsFieldsProps = {
  value: MexicanoSettings;
  onChange: (value: MexicanoSettings) => void;
  disabled?: boolean;
  className?: string;
};

export function MexicanoSettingsFields({
  value,
  onChange,
  disabled,
  className,
}: MexicanoSettingsFieldsProps) {
  return (
    <div className={cn("space-y-4 rounded-2xl border border-cp-border bg-cp-elevated/30 p-4", className)}>
      <div>
        <p className="text-sm font-semibold text-foreground">Mexicano setup</p>
        <p className="mt-1 text-xs leading-relaxed text-cp-muted">
          Round 1 is random. Later rounds pair from the live leaderboard — Individual rotates
          partners; Team keeps fixed pairs.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select
            value={value.mode}
            disabled={disabled}
            onValueChange={(mode) =>
              onChange({ ...value, mode: mode as MexicanoSettings["mode"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual (rotating partners)</SelectItem>
              <SelectItem value="team">Team (fixed pairs)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mexicano-rounds">Number of rounds</Label>
          <Input
            id="mexicano-rounds"
            type="number"
            min={MEXICANO_ROUNDS_MIN}
            max={MEXICANO_ROUNDS_MAX}
            disabled={disabled}
            value={value.roundCount}
            onChange={(e) => {
              const n = Math.floor(Number(e.target.value) || MEXICANO_ROUNDS_MIN);
              onChange({
                ...value,
                roundCount: Math.min(
                  MEXICANO_ROUNDS_MAX,
                  Math.max(MEXICANO_ROUNDS_MIN, n),
                ),
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
