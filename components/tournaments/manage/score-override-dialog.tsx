"use client";

import { useEffect, useState } from "react";
import { Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
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
import { LoadingOverlay } from "@/components/ui/loading-overlay";
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

type ScoreOverrideDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportSlug: string;
  tournamentSlug: string;
  kind: "group" | "bracket";
  matchId: string;
  teamAName: string | null;
  teamBName: string | null;
  initialScoreA?: number;
  initialScoreB?: number;
  onSuccess?: () => void;
};

/**
 * Question of Law override — correct completed match scores from the organizer dashboard.
 */
export function ScoreOverrideDialog({
  open,
  onOpenChange,
  sportSlug,
  tournamentSlug,
  kind,
  matchId,
  teamAName,
  teamBName,
  initialScoreA = 0,
  initialScoreB = 0,
  onSuccess,
}: ScoreOverrideDialogProps) {
  const [scoreA, setScoreA] = useState(String(initialScoreA));
  const [scoreB, setScoreB] = useState(String(initialScoreB));
  const [reason, setReason] = useState("");
  const [winnerSide, setWinnerSide] = useState<"a" | "b" | "auto">("auto");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScoreA(String(initialScoreA));
    setScoreB(String(initialScoreB));
    setReason("");
    setWinnerSide("auto");
  }, [open, matchId, initialScoreA, initialScoreB]);

  const save = async () => {
    const a = Number.parseInt(scoreA, 10);
    const b = Number.parseInt(scoreB, 10);
    if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) {
      toast.error("Enter valid non-negative scores");
      return;
    }
    if (reason.trim().length < 5) {
      toast.error("Explain the Question of Law (min 5 characters)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${tournamentSlug}/manage/score-override`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            matchId,
            scoreA: a,
            scoreB: b,
            reason: reason.trim(),
            winnerSide: winnerSide === "auto" ? null : winnerSide,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Override failed");
      }
      toast.success("Score overridden (audit logged)");
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Override failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {saving ? <LoadingOverlay show label="Applying override…" /> : null}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-cp-primary" />
            Quick override (Question of Law)
          </DialogTitle>
          <DialogDescription>
            Correct a completed match for input or rule errors — not field calls (in/out).
            Every change is audited.
            <span className="mt-1 block font-medium text-foreground">
              {teamAName ?? "Team A"} vs {teamBName ?? "Team B"}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-2">
            <Label>Score A</Label>
            <Input
              type="number"
              min={0}
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              className="border-cp-border bg-cp-elevated"
            />
          </div>
          <div className="space-y-2">
            <Label>Score B</Label>
            <Input
              type="number"
              min={0}
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              className="border-cp-border bg-cp-elevated"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Winner (if tied scores)</Label>
            <Select
              value={winnerSide}
              onValueChange={(v) => setWinnerSide(v as "a" | "b" | "auto")}
            >
              <SelectTrigger className={cpSelectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass}>
                <SelectItem value="auto" className={cpSelectItemClass}>
                  Higher score wins
                </SelectItem>
                <SelectItem value="a" className={cpSelectItemClass}>
                  {teamAName ?? "Team A"}
                </SelectItem>
                <SelectItem value="b" className={cpSelectItemClass}>
                  {teamBName ?? "Team B"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="override-reason">Reason</Label>
            <Input
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Wrong pair recorded on court tablet"
              className="border-cp-border bg-cp-elevated"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Apply override"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
