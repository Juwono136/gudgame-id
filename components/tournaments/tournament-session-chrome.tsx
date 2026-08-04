"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Maximize2, Pencil, Settings, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { getPhaseLabel } from "@/lib/tournaments/ui/labels";
import { isTournamentManageMode } from "@/lib/tournaments/manage-mode";
import {
  getTournamentStatusBadgeClass,
  sessionPhaseBadgeClass,
} from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";

type TournamentSessionChromeProps = {
  sportSlug: string;
  slug: string;
  tournamentId: string;
  name: string;
  phase: string;
  canManage?: boolean;
  canEdit?: boolean;
  editHref?: string;
  listHref?: string;
  backLabel?: string;
  manageActive?: boolean;
  /** Hide manage CTA when already on the manage page */
  hideManageButton?: boolean;
  onManageClick?: () => void;
  showCreateActions?: boolean;
  canCreateOfficial?: boolean;
  /** Override sport-route defaults (required for partner white-label manage/display). */
  publicUrl?: string;
  displayUrl?: string;
  manageUrl?: string;
  /**
   * Stick flush to the top of the viewport (partner manage has no Gud Game navbar).
   * Host/official keep offset under `--site-header-height`.
   */
  flushTop?: boolean;
  className?: string;
};

export function TournamentSessionChrome({
  sportSlug,
  slug,
  name,
  phase,
  canManage = false,
  canEdit = false,
  editHref,
  listHref = dashboardRoutes.tournaments,
  backLabel = "My tournaments",
  manageActive = false,
  hideManageButton = false,
  onManageClick,
  showCreateActions = false,
  canCreateOfficial = false,
  publicUrl: publicUrlProp,
  displayUrl: displayUrlProp,
  manageUrl: manageUrlProp,
  flushTop = false,
  className,
}: TournamentSessionChromeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tournamentUrl = publicUrlProp ?? publicSportRoutes.tournament(sportSlug, slug);
  const displayUrl = displayUrlProp ?? publicSportRoutes.tournamentDisplay(sportSlug, slug);
  const manageUrl = manageUrlProp ?? publicSportRoutes.tournamentManage(sportSlug, slug);
  const displayActive = pathname.endsWith("/display");

  const handleDisplay = () => {
    if (displayActive) {
      router.push(tournamentUrl);
      return;
    }
    router.push(displayUrl);
  };

  const handleManage = () => {
    if (onManageClick) {
      onManageClick();
      return;
    }
    if (manageActive) return;
    router.push(manageUrl);
  };

  return (
    <div
      className={cn(
        "sticky z-40 border-b border-cp-border bg-cp-card/95 backdrop-blur supports-[backdrop-filter]:bg-cp-card/80",
        flushTop ? "top-0" : "top-[var(--site-header-height,3.5rem)]",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-cp-muted sm:px-3"
            onClick={() => router.push(listHref)}
          >
            <ArrowLeft className="h-4 w-4 sm:mr-1" />
            <span className="sr-only sm:not-sr-only sm:inline">{backLabel}</span>
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          </div>

          <Badge
            className={cn(
              "shrink-0 border-0 text-[10px] uppercase",
              phase === "live"
                ? sessionPhaseBadgeClass.live
                : phase === "completed"
                  ? sessionPhaseBadgeClass.ended
                  : sessionPhaseBadgeClass.upcoming,
            )}
          >
            {getPhaseLabel(phase)}
          </Badge>
        </div>

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Button
            type="button"
            variant={displayActive ? "default" : "outline"}
            size="sm"
            className="h-8 shrink-0 px-2.5 sm:px-3"
            onClick={handleDisplay}
            title="Full-screen live scoreboard for venue screens"
          >
            <Maximize2 className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden min-[400px]:inline">
              {displayActive ? "Exit display" : "Display"}
            </span>
          </Button>

          {canEdit && editHref ? (
            <Button asChild variant="outline" size="sm" className="h-8 shrink-0 px-2.5 sm:px-3">
              <Link href={editHref}>
                <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden min-[400px]:inline">Edit</span>
              </Link>
            </Button>
          ) : null}

          {showCreateActions ? (
            <>
              {canCreateOfficial ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1 px-2 sm:px-3"
                  title="Create official tournament"
                >
                  <Link href={`${dashboardRoutes.hostTournamentsNew}?sport=${sportSlug}`}>
                    <Trophy className="h-3.5 w-3.5 text-cp-primary" />
                    <span className="text-xs font-semibold">Official</span>
                  </Link>
                </Button>
              ) : null}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1 px-2 sm:px-3"
                title="Create Fun Match"
              >
                <Link href={`${dashboardRoutes.tournamentsNew}?sport=${sportSlug}`}>
                  <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold">Fun</span>
                  <span className="hidden text-xs font-semibold min-[420px]:inline">Match</span>
                </Link>
              </Button>
            </>
          ) : null}

          {canManage && !hideManageButton ? (
            <Button
              type="button"
              variant={manageActive ? "default" : "outline"}
              size="sm"
              className="h-8 shrink-0 px-2.5 sm:px-3"
              onClick={handleManage}
            >
              <Settings className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden min-[400px]:inline">
                {manageActive ? "Managing" : "Manage"}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { isTournamentManageMode };
