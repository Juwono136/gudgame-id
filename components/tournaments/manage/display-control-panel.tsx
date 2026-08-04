"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Monitor, Play, Save } from "lucide-react";
import { toast } from "sonner";
import { BrandColorField } from "@/components/tournaments/form/brand-color-field";
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
import { useTournamentLive } from "@/hooks/use-tournament-live";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { isOfficialType } from "@/lib/tournaments/core/types";
import {
  getTournamentDisplayConfig,
  type TournamentDisplayBrandTheme,
  type TournamentDisplayLayout,
} from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { partnerPublicRoutes, publicSportRoutes } from "@/lib/constants/routes";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

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
  /** When set (partner white-label), display URLs use partnerPublicRoutes. */
  partnerSlug?: string | null;
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
  const brand = saved.brandTheme ?? {};
  return {
    layout,
    autoRotate,
    intervalSec: String(saved.rotationIntervalSec ?? 15),
    primaryColor: brand.primaryColor ?? "#0d9488",
    accentColor: brand.accentColor ?? "#14b8a6",
    backgroundStyle: brand.backgroundStyle ?? "gradient",
    scoreboardStyle: brand.scoreboardStyle ?? "classic",
    showPartnerLogo: brand.showPartnerLogo ?? true,
  };
}

export function DisplayControlPanel({
  tournament,
  partnerSlug = null,
  onSaved,
}: DisplayControlPanelProps) {
  const { confirm } = useConfirmDialog();
  const initial = resolveDisplayPanelState(tournament);
  const [layout, setLayout] = useState<TournamentDisplayLayout>(initial.layout);
  const [autoRotate, setAutoRotate] = useState(initial.autoRotate);
  const [intervalSec, setIntervalSec] = useState(initial.intervalSec);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [backgroundStyle, setBackgroundStyle] = useState<
    NonNullable<TournamentDisplayBrandTheme["backgroundStyle"]>
  >(initial.backgroundStyle);
  const [scoreboardStyle, setScoreboardStyle] = useState<
    NonNullable<TournamentDisplayBrandTheme["scoreboardStyle"]>
  >(initial.scoreboardStyle);
  const [showPartnerLogo, setShowPartnerLogo] = useState(initial.showPartnerLogo);
  const save = useUpdateTournamentDisplayConfig(tournament.sportSlug, tournament.slug);
  const { data: liveData } = useTournamentLive(tournament.sportSlug, tournament.slug);
  const courts = liveData?.courts ?? [];
  const isPartnerEvent = Boolean(tournament.partnerId);

  const usePartnerDisplay = Boolean(tournament.partnerId && partnerSlug);
  const displayPath = usePartnerDisplay
    ? partnerPublicRoutes.tournamentDisplay(partnerSlug!, tournament.slug)
    : publicSportRoutes.tournamentDisplay(tournament.sportSlug, tournament.slug);

  const copyCourtDisplayUrl = async (courtId: string, courtName: string) => {
    const path = usePartnerDisplay
      ? partnerPublicRoutes.tournamentDisplayCourt(partnerSlug!, tournament.slug, courtId)
      : publicSportRoutes.tournamentDisplayCourt(
          tournament.sportSlug,
          tournament.slug,
          courtId,
        );
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Copied ${courtName} display URL`);
    } catch {
      toast.error("Could not copy URL");
    }
  };

  useEffect(() => {
    const next = resolveDisplayPanelState(tournament);
    setLayout(next.layout);
    setAutoRotate(next.autoRotate);
    setIntervalSec(next.intervalSec);
    setPrimaryColor(next.primaryColor);
    setAccentColor(next.accentColor);
    setBackgroundStyle(next.backgroundStyle);
    setScoreboardStyle(next.scoreboardStyle);
    setShowPartnerLogo(next.showPartnerLogo);
  }, [tournament]);

  const handleSave = async () => {
    const sec = Math.min(120, Math.max(5, parseInt(intervalSec, 10) || 15));
    if (isPartnerEvent) {
      const primary = primaryColor.trim();
      const accent = accentColor.trim();
      if (!HEX_COLOR_RE.test(primary) || !HEX_COLOR_RE.test(accent)) {
        toast.error("Brand colors must be hex values like #0d9488");
        return;
      }
    }
    const ok = await confirm({
      title: "Save display settings?",
      description: autoRotate
        ? `Venue screens will switch layouts every ${sec} seconds automatically.`
        : `Venue screens will show the "${layout}" layout.`,
      confirmLabel: "Save",
    });
    if (!ok) return;
    const brandTheme: TournamentDisplayBrandTheme | undefined = isPartnerEvent
      ? {
          primaryColor: primaryColor.trim(),
          accentColor: accentColor.trim(),
          backgroundStyle,
          scoreboardStyle,
          showPartnerLogo,
        }
      : undefined;
    save.mutate(
      {
        layout: autoRotate ? "rotation" : layout,
        autoRotate,
        rotationIntervalSec: sec,
        rotationLayouts: autoRotate ? ROTATION_OPTIONS : undefined,
        ...(brandTheme ? { brandTheme } : {}),
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

        {isPartnerEvent ? (
          <div className="mt-6 space-y-4 rounded-xl border border-cp-border/70 bg-cp-elevated/20 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Event brand theme</p>
              <p className="mt-1 text-xs text-cp-muted">
                Customize TV, website scoreboard, and venue graphics for this event — not a
                generic template for every tournament.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <BrandColorField
                id="brand-primary"
                label="Primary color"
                value={primaryColor}
                onChange={setPrimaryColor}
                description="TV & scoreboards"
              />
              <BrandColorField
                id="brand-accent"
                label="Accent color"
                value={accentColor}
                onChange={setAccentColor}
                description="Highlights"
              />
              <div className="space-y-2">
                <Label>Background atmosphere</Label>
                <Select
                  value={backgroundStyle}
                  onValueChange={(v) =>
                    setBackgroundStyle(v as NonNullable<TournamentDisplayBrandTheme["backgroundStyle"]>)
                  }
                >
                  <SelectTrigger className={cpSelectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    <SelectItem value="gradient" className={cpSelectItemClass}>
                      Soft gradient
                    </SelectItem>
                    <SelectItem value="dark_court" className={cpSelectItemClass}>
                      Dark court grid
                    </SelectItem>
                    <SelectItem value="solid" className={cpSelectItemClass}>
                      Solid night
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scoreboard style</Label>
                <Select
                  value={scoreboardStyle}
                  onValueChange={(v) =>
                    setScoreboardStyle(v as NonNullable<TournamentDisplayBrandTheme["scoreboardStyle"]>)
                  }
                >
                  <SelectTrigger className={cpSelectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={cpSelectContentClass}>
                    <SelectItem value="classic" className={cpSelectItemClass}>
                      Classic
                    </SelectItem>
                    <SelectItem value="bold" className={cpSelectItemClass}>
                      Bold
                    </SelectItem>
                    <SelectItem value="minimal" className={cpSelectItemClass}>
                      Minimal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPartnerLogo((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                showPartnerLogo
                  ? "border-cp-primary/40 bg-cp-primary/10"
                  : "border-cp-border bg-cp-card/40 hover:bg-cp-elevated/40",
              )}
            >
              <span>
                <span className="block font-medium text-foreground">Show partner logo on TV</span>
                <span className="mt-0.5 block text-xs text-cp-muted">
                  Keeps brand presence on venue screens when a logo is uploaded.
                </span>
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  showPartnerLogo
                    ? "bg-cp-primary text-white"
                    : "bg-cp-elevated text-cp-muted",
                )}
              >
                {showPartnerLogo ? "On" : "Off"}
              </span>
            </button>
          </div>
        ) : null}

        {isPartnerEvent ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-cp-border">
            <div className="border-b border-cp-border/70 bg-cp-elevated/30 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                Live preview
              </p>
            </div>
            <div
              className={cn(
                "relative px-4 py-6 text-white",
                scoreboardStyle === "bold" && "tracking-tight",
                scoreboardStyle === "minimal" && "font-light",
              )}
              style={{
                background:
                  backgroundStyle === "solid"
                    ? "#0a0f18"
                    : backgroundStyle === "dark_court"
                      ? "#05070c"
                      : `radial-gradient(ellipse 120% 80% at 50% -20%, ${primaryColor}59, transparent 55%), #070b14`,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background: `radial-gradient(ellipse 60% 50% at 100% 100%, ${accentColor}33, transparent 50%)`,
                }}
                aria-hidden
              />
              <div className="relative space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Venue scoreboard
                </p>
                <p className="text-lg font-semibold sm:text-xl">{tournament.name}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span
                    className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </span>
                  <span
                    className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    Accent
                  </span>
                  <span className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs capitalize text-white/80">
                    {backgroundStyle.replace("_", " ")} · {scoreboardStyle}
                  </span>
                </div>
                <p className="pt-2 text-[11px] text-white/55">
                  Save to push this theme to the public page and TV display within a few seconds.
                </p>
              </div>
            </div>
          </div>
        ) : null}

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
        <p className="font-medium text-foreground">Per-court display URLs</p>
        <p className="mt-1 text-xs sm:text-sm">
          Pin a venue TV to one court — rotation is disabled when a court is pinned.
        </p>
        {courts.length ? (
          <ul className="mt-3 space-y-2">
            {[...courts]
              .sort((a, b) => (a.sortOrder ?? a.courtNumber) - (b.sortOrder ?? b.courtNumber))
              .map((court) => (
                <li
                  key={court.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cp-border/60 bg-cp-card/40 px-3 py-2"
                >
                  <span className="text-sm font-medium text-foreground">{court.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyCourtDisplayUrl(court.id, court.name)}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy display URL
                  </Button>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs">Courts appear here once the tournament is provisioned.</p>
        )}
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
