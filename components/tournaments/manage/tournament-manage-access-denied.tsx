"use client";

import Link from "next/link";
import { ArrowLeft, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardRoutes, resolveTournamentSurfaceUrls } from "@/lib/constants/routes";

type TournamentManageAccessDeniedProps = {
  sportSlug: string;
  slug: string;
  tournamentName: string;
  reason: "revoked" | "forbidden";
  partnerId?: string | null;
  partnerSlug?: string | null;
};

export function TournamentManageAccessDenied({
  sportSlug,
  slug,
  tournamentName,
  reason,
  partnerId = null,
  partnerSlug = null,
}: TournamentManageAccessDeniedProps) {
  const { publicUrl: tournamentUrl } = resolveTournamentSurfaceUrls({
    sportSlug,
    slug,
    partnerId,
    partnerSlug,
  });
  const title =
    reason === "revoked" ? "Staff access removed" : "Manage access unavailable";
  const description =
    reason === "revoked"
      ? `Your staff invite for “${tournamentName}” was revoked by the organizer. You no longer have access to the manage workspace.`
      : `Only the tournament organizer, partner organization members, or invited staff can open the manage workspace for “${tournamentName}”.`;

  return (
    <div className="mx-auto flex min-h-[min(70dvh,40rem)] max-w-lg flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40">
        <ShieldOff className="h-7 w-7 text-amber-700 dark:text-amber-300" aria-hidden />
      </div>

      <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-cp-muted sm:text-base">{description}</p>
      <p className="mt-2 text-xs text-cp-muted">
        If you still need access, ask the organizer to send a new staff invite.
      </p>

      <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild className="h-11 bg-cp-primary hover:bg-cp-primary-light sm:min-w-[11rem]">
          <Link href={tournamentUrl}>View tournament</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 border-cp-border sm:min-w-[11rem]">
          <Link href={dashboardRoutes.home}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
