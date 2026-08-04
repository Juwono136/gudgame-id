"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, TabletSmartphone } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { getTournamentScoreEntryMode } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type ScoreEntryMode = "live" | "paper";

type ScoreEntryPanelProps = {
  tournament: TournamentDetail;
  onSaved?: () => void | Promise<void>;
};

export function ScoreEntryPanel({ tournament, onSaved }: ScoreEntryPanelProps) {
  const { confirm } = useConfirmDialog();
  const qc = useQueryClient();
  const [mode, setMode] = useState<ScoreEntryMode>(() =>
    getTournamentScoreEntryMode(tournament),
  );

  useEffect(() => {
    setMode(getTournamentScoreEntryMode(tournament));
  }, [tournament]);

  const save = useMutation({
    mutationFn: async (scoreEntryMode: ScoreEntryMode) => {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/manage/score-entry`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scoreEntryMode }),
        },
      );
      const json = await parseJsonResponse<{
        success: boolean;
        data: { scoreEntryMode: ScoreEntryMode };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Could not save score entry mode"));
      }
      return json.data.scoreEntryMode;
    },
    onSuccess: async (next) => {
      setMode(next);
      await qc.invalidateQueries({
        queryKey: ["tournaments", "manage-detail", tournament.sportSlug, tournament.slug],
      });
      void qc.invalidateQueries({
        queryKey: tournamentQueryKeys.live(tournament.sportSlug, tournament.slug),
      });
      toast.success(
        next === "live"
          ? "Live scoring enabled for courtside tablets"
          : "Paper mode enabled — enter final scores after play",
      );
      await onSaved?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = async () => {
    const current = getTournamentScoreEntryMode(tournament);
    if (mode === current) {
      toast.message("No changes to save");
      return;
    }

    const ok = await confirm({
      title: "Update score entry mode?",
      description:
        mode === "live"
          ? "Courtside tablets will push live scores to the display screens."
          : "Live TV updates pause during play — enter final scores in batch afterwards.",
      confirmLabel: "Save",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    save.mutate(mode);
  };

  return (
    <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/10 text-cp-primary">
          <TabletSmartphone className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">Score entry</h2>
          <p className="mt-1 text-sm text-cp-muted">
            {tournament.partnerId
              ? "Choose live tablet scoring or paper/batch entry for referees. This only affects your partner event — never Gud Game rankings. Change anytime from Manage → Display."
              : "Choose how results are entered during this event. You can change this anytime from Manage → Display."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="score-entry-mode">Mode</Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as ScoreEntryMode)}
            disabled={save.isPending}
          >
            <SelectTrigger id="score-entry-mode" className={cpSelectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={cpSelectContentClass}>
              <SelectItem value="live" className={cpSelectItemClass}>
                Live tablet / courtside
              </SelectItem>
              <SelectItem value="paper" className={cpSelectItemClass}>
                Paper / batch final scores
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-cp-muted">
            {mode === "live"
              ? "Scores update on display screens as matches are played."
              : "Enter results later — display stays on schedule until scores are finalized."}
          </p>
        </div>
        <Button
          type="button"
          className="bg-cp-primary hover:bg-cp-primary-light sm:min-w-[8.5rem]"
          disabled={save.isPending}
          onClick={() => void handleSave()}
        >
          {save.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
