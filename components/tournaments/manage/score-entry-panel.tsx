"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Save, TabletSmartphone } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { getTournamentScoreEntryMode } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { tournamentQueryKeys } from "@/lib/tournaments/query-keys";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

type ScoreEntryMode = "live" | "paper";

type ScoreEntryPanelProps = {
  tournament: TournamentDetail;
  onSaved?: () => void | Promise<void>;
};

const MODE_CARDS: {
  value: ScoreEntryMode;
  title: string;
  icon: typeof TabletSmartphone;
  bullets: string[];
}[] = [
  {
    value: "live",
    title: "Live tablet / courtside",
    icon: TabletSmartphone,
    bullets: [
      "Point-by-point scoring on court",
      "TV display updates in real time",
      "Best for dedicated scorekeepers",
    ],
  },
  {
    value: "paper",
    title: "Paper / batch final scores",
    icon: ClipboardList,
    bullets: [
      "Enter final score after the match",
      "Large steppers for field referees",
      "Display stays on schedule until finish",
    ],
  },
];

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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {MODE_CARDS.map((card) => {
          const selected = mode === card.value;
          const Icon = card.icon;
          return (
            <button
              key={card.value}
              type="button"
              disabled={save.isPending}
              onClick={() => setMode(card.value)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all duration-200",
                selected
                  ? "border-cp-primary bg-cp-primary/10 ring-1 ring-cp-primary/40 shadow-sm"
                  : "border-cp-border bg-cp-elevated/40 hover:border-cp-border hover:bg-cp-elevated/70",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    selected ? "bg-cp-primary/20 text-cp-primary" : "bg-cp-bg text-cp-muted",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
              </div>
              <ul className="mt-3 space-y-1.5">
                {card.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-xs text-cp-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cp-primary/70" />
                    {b}
                  </li>
                ))}
              </ul>
              {card.value === "paper" && selected ? (
                <p className="mt-3 rounded-lg border border-cp-border/80 bg-cp-bg/60 px-2.5 py-2 text-[11px] leading-relaxed text-cp-muted">
                  On Live scoring: open a match → set final score with ± steppers →{" "}
                  <span className="font-medium text-foreground">Finish</span>.
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
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
