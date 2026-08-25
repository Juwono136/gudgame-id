"use client";

import { Loader2, Swords } from "lucide-react";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamPlayerList } from "@/components/tournaments/team-player-list";
import { cn } from "@/lib/utils";

export type KnockoutPairingSlotRef = { matchId: string; slot: "a" | "b" };

type PairingTeam = {
  id: string;
  name: string;
  members?: { displayName: string }[];
};

type KnockoutPairingEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: BracketMatchView[];
  teams: PairingTeam[];
  selected: KnockoutPairingSlotRef | null;
  busy: boolean;
  swapMode: boolean;
  onSelectSlot: (matchId: string, slot: "a" | "b") => void;
};

function isEntryMatch(match: BracketMatchView, includePlayIn: boolean): boolean {
  if (match.matchNumber === 999 || match.seriesParentId) return false;
  if (match.roundNumber === 1) return true;
  return includePlayIn && match.roundNumber === 0;
}

function slotTeamId(match: BracketMatchView, slot: "a" | "b"): string | null {
  return slot === "a" ? match.teamAId : match.teamBId;
}

function slotTeamName(match: BracketMatchView, slot: "a" | "b"): string | null {
  return slot === "a" ? match.teamAName : match.teamBName;
}

export function KnockoutPairingEditorDialog({
  open,
  onOpenChange,
  matches,
  teams,
  selected,
  busy,
  swapMode,
  onSelectSlot,
}: KnockoutPairingEditorDialogProps) {
  const entry = matches
    .filter((m) => isEntryMatch(m, swapMode) && m.status === "pending")
    .sort((a, b) => a.roundNumber - b.roundNumber || a.matchNumber - b.matchNumber);

  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-cp-primary" />
            Arrange knockout pairings
          </DialogTitle>
          <DialogDescription>
            {swapMode
              ? "Tap one team, then tap another to swap them. Default draw is group 1st vs 1st from another group — change it here (for example 1st A vs 2nd B)."
              : "Tap a slot, then tap another slot to move or swap teams in round one."}
          </DialogDescription>
        </DialogHeader>

        {busy ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-cp-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating pairings…
          </div>
        ) : entry.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cp-border px-4 py-8 text-center text-sm text-cp-muted">
            No editable first-round matches. Pairings lock after a knockout match starts.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {entry.map((match) => (
              <li
                key={match.id}
                className="overflow-hidden rounded-xl border border-cp-border bg-cp-elevated/25"
              >
                <p className="border-b border-cp-border/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-cp-muted">
                  {match.roundNumber === 0 ? "Play-in" : "Round 1"} · Match {match.matchNumber}
                </p>
                <div className="divide-y divide-cp-border/50 p-1.5">
                  {(["a", "b"] as const).map((slot) => {
                    const id = slotTeamId(match, slot);
                    const name = slotTeamName(match, slot);
                    const team = id ? teamById.get(id) : null;
                    const active =
                      selected?.matchId === match.id && selected.slot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={busy}
                        onClick={() => onSelectSlot(match.id, slot)}
                        className={cn(
                          "flex w-full min-h-14 flex-col items-start rounded-lg px-3 py-2 text-left transition-colors",
                          active
                            ? "bg-cp-primary/15 ring-2 ring-cp-primary"
                            : "hover:bg-cp-card",
                        )}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                          Slot {slot.toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {name?.trim() || "Empty"}
                        </span>
                        {team?.members?.length ? (
                          <TeamPlayerList names={team.members} maxNames={4} compact />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
