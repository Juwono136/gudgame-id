"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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

type SpecialResultDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sportSlug: string;
  tournamentSlug: string;
  kind: "group" | "bracket";
  matchId: string;
  teamAName: string | null;
  teamBName: string | null;
  onSuccess?: () => void;
};

/**
 * ITF Duties & Procedures — record Walkover / Retirement / Withdrawal.
 */
export function SpecialResultDialog({
  open,
  onOpenChange,
  sportSlug,
  tournamentSlug,
  kind,
  matchId,
  teamAName,
  teamBName,
  onSuccess,
}: SpecialResultDialogProps) {
  const [method, setMethod] = useState<"walkover" | "retirement" | "withdrawal">(
    "walkover",
  );
  const [winnerSide, setWinnerSide] = useState<"a" | "b">("a");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMethod("walkover");
    setWinnerSide("a");
    setReason("");
  }, [open, matchId]);

  const save = async () => {
    if (reason.trim().length < 5) {
      toast.error("Explain the ruling (min 5 characters)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/tournaments/${sportSlug}/${tournamentSlug}/manage/special-result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            matchId,
            method,
            winnerSide,
            reason: reason.trim(),
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to record result");
      }
      toast.success(`${method} recorded (ITF score convention)`);
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record result");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {saving ? <LoadingOverlay show label="Recording…" /> : null}
        <DialogHeader>
          <DialogTitle>Walkover / Retirement / Withdrawal</DialogTitle>
          <DialogDescription>
            Per ITF Duties &amp; Procedures for Officials.{" "}
            {teamAName ?? "Team A"} vs {teamBName ?? "Team B"}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Ruling</Label>
            <Select
              value={method}
              onValueChange={(v) =>
                setMethod(v as "walkover" | "retirement" | "withdrawal")
              }
            >
              <SelectTrigger className={cpSelectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass}>
                <SelectItem value="walkover" className={cpSelectItemClass}>
                  Walkover (default) — 6–0 sets to winner
                </SelectItem>
                <SelectItem value="retirement" className={cpSelectItemClass}>
                  Retirement — finish set from last score
                </SelectItem>
                <SelectItem value="withdrawal" className={cpSelectItemClass}>
                  Withdrawal — treated as walkover score
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Winner</Label>
            <Select
              value={winnerSide}
              onValueChange={(v) => setWinnerSide(v as "a" | "b")}
            >
              <SelectTrigger className={cpSelectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass}>
                <SelectItem value="a" className={cpSelectItemClass}>
                  {teamAName ?? "Team A"}
                </SelectItem>
                <SelectItem value="b" className={cpSelectItemClass}>
                  {teamBName ?? "Team B"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="special-reason">Reason</Label>
            <Input
              id="special-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Opponent no-show / injury retirement"
              className="border-cp-border bg-cp-elevated"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Record ruling
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
