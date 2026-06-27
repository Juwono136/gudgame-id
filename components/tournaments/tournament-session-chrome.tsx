"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Maximize2, Pencil, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { getPhaseLabel } from "@/lib/tournaments/ui/labels";
import { isTournamentManageMode } from "@/lib/tournaments/manage-mode";
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
  manageActive?: boolean;
  onManageClick?: () => void;
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
  manageActive = false,
  onManageClick,
  className,
}: TournamentSessionChromeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tournamentUrl = publicSportRoutes.tournament(sportSlug, slug);
  const displayUrl = publicSportRoutes.tournamentDisplay(sportSlug, slug);
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
    router.push(publicSportRoutes.tournamentManage(sportSlug, slug));
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b border-cp-border bg-cp-card/95 backdrop-blur supports-[backdrop-filter]:bg-cp-card/80",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-cp-muted"
          onClick={() => router.push(listHref)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">My tournaments</span>
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        </div>

        <Badge
          className={cn(
            "shrink-0 border-0 text-[10px] uppercase",
            phase === "live"
              ? "bg-red-900/50 text-red-200"
              : phase === "completed"
                ? "bg-cp-elevated text-cp-muted"
                : "bg-sky-900/40 text-sky-200",
          )}
        >
          {getPhaseLabel(phase)}
        </Badge>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={displayActive ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={handleDisplay}
            title="Full-screen live scoreboard for venue screens"
          >
            <Maximize2 className="mr-1 h-3.5 w-3.5" />
            {displayActive ? "Exit display" : "Display"}
          </Button>

          {canEdit && editHref ? (
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link href={editHref}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          ) : null}

          {canManage ? (
            <Button
              type="button"
              variant={manageActive ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={handleManage}
            >
              <Settings className="mr-1 h-3.5 w-3.5" />
              {manageActive ? "Managing" : "Manage"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { isTournamentManageMode };
