"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  GROUP_MEETINGS_PER_PAIR_MAX,
  GROUP_MEETINGS_PER_PAIR_MIN,
  KNOCKOUT_LEGS_PER_SLOT_MAX,
  KNOCKOUT_LEGS_PER_SLOT_MIN,
} from "@/lib/tournaments/match-config";
import { cn } from "@/lib/utils";

type CustomMeetingsFieldsProps = {
  showGroupMeetings: boolean;
  showKnockoutLegs: boolean;
  groupMeetingsPerPair: number;
  knockoutLegsPerSlot: number;
  onGroupMeetingsChange: (value: number) => void;
  onKnockoutLegsChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function CustomMeetingsFields({
  showGroupMeetings,
  showKnockoutLegs,
  groupMeetingsPerPair,
  knockoutLegsPerSlot,
  onGroupMeetingsChange,
  onKnockoutLegsChange,
  disabled,
  className,
}: CustomMeetingsFieldsProps) {
  if (!showGroupMeetings && !showKnockoutLegs) return null;

  const legsEven = knockoutLegsPerSlot % 2 === 0;

  return (
    <div className={cn("space-y-4 rounded-2xl border border-cp-border bg-cp-elevated/30 p-4", className)}>
      <div>
        <p className="text-sm font-semibold text-foreground">How many times they play</p>
        <p className="mt-1 text-xs leading-relaxed text-cp-muted">
          Group meetings create separate fixtures that each count in standings. Knockout legs
          form a series — majority of legs advances.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {showGroupMeetings ? (
          <div className="space-y-2">
            <Label htmlFor="group-meetings">Meetings per pair (group)</Label>
            <Input
              id="group-meetings"
              type="number"
              min={GROUP_MEETINGS_PER_PAIR_MIN}
              max={GROUP_MEETINGS_PER_PAIR_MAX}
              disabled={disabled}
              value={groupMeetingsPerPair}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                onGroupMeetingsChange(
                  Math.min(
                    GROUP_MEETINGS_PER_PAIR_MAX,
                    Math.max(GROUP_MEETINGS_PER_PAIR_MIN, Math.floor(n)),
                  ),
                );
              }}
            />
            <p className="text-[11px] text-cp-muted">
              Each unordered pair plays this many independent matches.
            </p>
          </div>
        ) : null}
        {showKnockoutLegs ? (
          <div className="space-y-2">
            <Label htmlFor="ko-legs">Legs per knockout slot</Label>
            <Input
              id="ko-legs"
              type="number"
              min={KNOCKOUT_LEGS_PER_SLOT_MIN}
              max={KNOCKOUT_LEGS_PER_SLOT_MAX}
              disabled={disabled}
              value={knockoutLegsPerSlot}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                onKnockoutLegsChange(
                  Math.min(
                    KNOCKOUT_LEGS_PER_SLOT_MAX,
                    Math.max(KNOCKOUT_LEGS_PER_SLOT_MIN, Math.floor(n)),
                  ),
                );
              }}
            />
            <p className="text-[11px] text-cp-muted">
              {legsEven
                ? "Even leg counts can tie — odd values (3, 5, 7) are recommended."
                : "First side to win a majority of legs advances."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
