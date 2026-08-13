"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { MatchScheduleBoard } from "@/components/tournaments/double-stage/match-schedule-board";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { GroupOverview } from "@/lib/tournaments/double-stage/service";
import {
  MATCH_CALL_STATUSES,
  parseCallStatus,
  type ScheduleMatchRow,
} from "@/lib/tournaments/double-stage/schedule-view";
import { getBracketRoundLabel } from "@/lib/tournaments/brackets/round-labels";
import type { BracketMatchView } from "@/lib/tournaments/brackets/service";
import { getTournamentMatchScoreMode } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";

type DoubleStageScheduleManageProps = {
  tournament: TournamentDetail;
  groups: GroupOverview[];
  bracketMatches?: BracketMatchView[];
  onUpdated?: () => void;
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DoubleStageScheduleManage({
  tournament,
  groups,
  bracketMatches = [],
  onUpdated,
}: DoubleStageScheduleManageProps) {
  const gamesScoreMode = getTournamentMatchScoreMode(tournament, "group") === "games";
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ScheduleMatchRow | null>(null);
  const [draft, setDraft] = useState("");
  const [playOrderDraft, setPlayOrderDraft] = useState("");
  const [callStatusDraft, setCallStatusDraft] = useState<string>("queued");

  const rows = useMemo((): ScheduleMatchRow[] => {
    const groupRows: ScheduleMatchRow[] = groups.flatMap((g) =>
      g.matches.map((m) => ({
        id: m.id,
        kind: "group" as const,
        stageLabel: `Group stage · ${g.name}`,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
        scheduledAt: m.scheduledAt,
        courtId: m.courtId,
        playOrder: m.playOrder,
        callStatus: parseCallStatus(m.callStatus),
      })),
    );

    const totalRounds = bracketMatches.length
      ? Math.max(...bracketMatches.map((m) => m.roundNumber), 1)
      : 1;
    const bracketRows: ScheduleMatchRow[] = bracketMatches.map((m) => ({
      id: m.id,
      kind: "bracket" as const,
      stageLabel: getBracketRoundLabel(m.roundNumber, totalRounds),
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      status: m.status,
      scheduledAt: m.scheduledAt,
      courtId: m.courtId,
      playOrder: m.playOrder,
      callStatus: parseCallStatus(m.callStatus),
    }));

    return [...groupRows, ...bracketRows];
  }, [groups, bracketMatches]);

  const openEditor = useCallback((match: ScheduleMatchRow) => {
    setEditing(match);
    setDraft(toLocalInputValue(match.scheduledAt));
    setPlayOrderDraft(match.playOrder != null ? String(match.playOrder) : "");
    setCallStatusDraft(match.callStatus ?? "queued");
  }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const scheduledAt = draft.trim() ? new Date(draft).toISOString() : null;
      if (draft.trim() && Number.isNaN(new Date(draft).getTime())) {
        toast.error("Enter a valid date and time");
        return;
      }
      const playOrder =
        playOrderDraft.trim() === ""
          ? null
          : Number.parseInt(playOrderDraft, 10);
      if (playOrderDraft.trim() && (Number.isNaN(playOrder!) || playOrder! < 0)) {
        toast.error("Play order must be a non-negative number");
        return;
      }

      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/schedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: editing.kind,
            matchId: editing.id,
            scheduledAt,
            playOrder,
            callStatus: callStatusDraft,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to save schedule");
      }
      toast.success("Order of Play updated");
      setEditing(null);
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <MatchScheduleBoard
        matches={rows}
        gamesScoreMode={gamesScoreMode}
        onEditSchedule={openEditor}
        defaultView="orderOfPlay"
        emptyMessage="Fixtures appear after groups are generated. Set play order and call status here — they show on the public Matches tab."
      />

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order of Play</DialogTitle>
            <DialogDescription>
              {editing
                ? `${editing.teamAName ?? "TBD"} vs ${editing.teamBName ?? "TBD"} · ${editing.stageLabel}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="play-order">Play order</Label>
              <Input
                id="play-order"
                type="number"
                min={0}
                value={playOrderDraft}
                onChange={(e) => setPlayOrderDraft(e.target.value)}
                placeholder="e.g. 1"
                className="border-cp-border bg-cp-elevated"
              />
            </div>
            <div className="space-y-2">
              <Label>Call status</Label>
              <Select value={callStatusDraft} onValueChange={setCallStatusDraft}>
                <SelectTrigger className={cpSelectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cpSelectContentClass}>
                  {MATCH_CALL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className={cpSelectItemClass}>
                      {s === "on_court"
                        ? "On court"
                        : s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kickoff">Kickoff (local time)</Label>
              <Input
                id="kickoff"
                type="datetime-local"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="border-cp-border bg-cp-elevated"
              />
              <p className="text-xs text-cp-muted">
                Optional kickoff time for the public Matches tab.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft("");
                setPlayOrderDraft("");
                setCallStatusDraft("queued");
              }}
              disabled={saving}
            >
              Clear
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
