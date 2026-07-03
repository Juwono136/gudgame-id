"use client";

import { useEffect, useState } from "react";
import { Loader2, Monitor, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateTournamentDisplayConfig } from "@/hooks/use-tournament-manage-display";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { isOfficialType } from "@/lib/tournaments/core/types";
import {
  getTournamentDisplayConfig,
  type TournamentDisplayLayout,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

const LAYOUTS: { value: TournamentDisplayLayout; label: string; description: string }[] = [
  {
    value: "single",
    label: "Featured court",
    description: "One live match full-screen — rotates when several courts are active",
  },
  {
    value: "multi_court",
    label: "Multi-court grid",
    description: "Every live court at once — recommended for 2+ courts",
  },
  {
    value: "bracket",
    label: "Live bracket",
    description: "Elimination bracket with live scores",
  },
  {
    value: "leaderboard",
    label: "Leaderboard",
    description: "Player standings (W-L-T, points) from finalized matches",
  },
];

const ROTATION_OPTIONS: TournamentDisplayLayout[] = [
  "multi_court",
  "single",
  "leaderboard",
  "bracket",
];

type DisplayControlPanelProps = {
  tournament: TournamentDetail;
  onSaved?: () => void | Promise<void>;
};

function resolveDisplayPanelState(tournament: TournamentDetail) {
  const saved = getTournamentDisplayConfig(tournament);
  const autoRotate = Boolean(saved.autoRotate || saved.layout === "rotation");
  const fallbackLayout: TournamentDisplayLayout = isOfficialType(tournament.tournamentType)
    ? "single"
    : "multi_court";
  const layout: TournamentDisplayLayout =
    saved.layout === "rotation" || autoRotate
      ? saved.rotationLayouts?.[0] ?? fallbackLayout
      : saved.layout;
  return {
    layout,
    autoRotate,
    intervalSec: String(saved.rotationIntervalSec ?? 15),
  };
}

export function DisplayControlPanel({ tournament, onSaved }: DisplayControlPanelProps) {
  const { confirm } = useConfirmDialog();
  const initial = resolveDisplayPanelState(tournament);
  const [layout, setLayout] = useState<TournamentDisplayLayout>(initial.layout);
  const [autoRotate, setAutoRotate] = useState(initial.autoRotate);
  const [intervalSec, setIntervalSec] = useState(initial.intervalSec);
  const save = useUpdateTournamentDisplayConfig(tournament.sportSlug, tournament.slug);

  const displayPath = publicSportRoutes.tournamentDisplay(tournament.sportSlug, tournament.slug);

  useEffect(() => {
    const next = resolveDisplayPanelState(tournament);
    setLayout(next.layout);
    setAutoRotate(next.autoRotate);
    setIntervalSec(next.intervalSec);
  }, [tournament]);

  const handleSave = async () => {
    const sec = Math.min(120, Math.max(5, parseInt(intervalSec, 10) || 15));
    const ok = await confirm({
      title: "Save display settings?",
      description: autoRotate
        ? `Venue screens will switch layouts every ${sec} seconds automatically.`
        : `Venue screens will show the "${layout}" layout.`,
      confirmLabel: "Save",
    });
    if (!ok) return;
    save.mutate(
      {
        layout: autoRotate ? "rotation" : layout,
        autoRotate,
        rotationIntervalSec: sec,
        rotationLayouts: autoRotate ? ROTATION_OPTIONS : undefined,
      },
      {
        onSuccess: () => {
          void onSaved?.();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/12 text-cp-primary">
            <Monitor className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Venue display</h2>
            <p className="mt-1 text-sm text-cp-muted">
              Save settings here — any open full-screen display at{" "}
              <code className="rounded bg-cp-elevated px-1 py-0.5 text-xs">{displayPath}</code>{" "}
              updates automatically within a few seconds.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Layout preset</Label>
            <Select
              value={layout}
              onValueChange={(v) => setLayout(v as TournamentDisplayLayout)}
              disabled={autoRotate}
            >
              <SelectTrigger className={cn(cpSelectTriggerClass, autoRotate && "opacity-60")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cpSelectContentClass}>
                {LAYOUTS.map((item) => (
                  <SelectItem key={item.value} value={item.value} className={cpSelectItemClass}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-cp-muted">
              {LAYOUTS.find((l) => l.value === layout)?.description}
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                autoRotate
                  ? "border-cp-primary/40 bg-cp-primary/10"
                  : "border-cp-border bg-cp-elevated/20 hover:bg-cp-elevated/40",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  autoRotate ? "bg-cp-primary text-white" : "bg-cp-elevated text-cp-muted",
                )}
              >
                <Play className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">Auto-play slideshow</span>
                <span className="mt-0.5 block text-xs text-cp-muted">
                  Cycle through single match, multi-court, leaderboard, and bracket views with smooth
                  transitions.
                </span>
              </span>
            </button>
          </div>

          {autoRotate ? (
            <div className="space-y-2">
              <Label htmlFor="rotate-interval">Seconds per slide</Label>
              <Input
                id="rotate-interval"
                type="number"
                min={5}
                max={120}
                value={intervalSec}
                onChange={(e) => setIntervalSec(e.target.value)}
                className="border-cp-border bg-cp-elevated/50"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleSave()} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save display settings
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-cp-border/70 bg-cp-elevated/20 px-4 py-3 text-sm text-cp-muted">
        <p className="font-medium text-foreground">How to use</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs sm:text-sm">
          <li>Open the display URL on a TV or projector browser (bookmark it once).</li>
          <li>Adjust layout or auto-play here, then click Save.</li>
          <li>The venue screen refreshes automatically — no copy/paste needed.</li>
        </ol>
      </div>
    </div>
  );
}
