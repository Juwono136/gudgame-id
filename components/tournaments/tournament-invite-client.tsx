"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerInviteAcceptClient } from "@/components/tournaments/invite/player-invite-accept-client";
import { StaffInviteAcceptClient } from "@/components/tournaments/invite/staff-invite-accept-client";
import { InviteAcceptShell } from "@/components/tournaments/invite/invite-accept-shared";
import { publicSportRoutes } from "@/lib/constants/routes";
import { supportsPlayerInvites } from "@/lib/tournaments/core/types";

type TournamentInviteClientProps = {
  sportSlug: string;
  slug: string;
  tournamentId: string;
  tournamentName: string;
  tournamentType?: string;
  officialBilling?: string | null;
  /** When set (partner white-label), back/accept redirects stay on partner URLs. */
  surfaceUrls?: {
    publicUrl: string;
    manageUrl: string;
    inviteUrl: string;
  };
};

/**
 * Routes to a dedicated staff or player invite accept flow.
 * Staff and player invites are never mixed in one form.
 */
export function TournamentInviteClient({
  sportSlug,
  slug,
  tournamentId,
  tournamentName,
  tournamentType,
  officialBilling,
  surfaceUrls,
}: TournamentInviteClientProps) {
  const searchParams = useSearchParams();
  const kindParam = searchParams.get("kind");
  const token = searchParams.get("token");
  const allowPlayerInvites = supportsPlayerInvites({
    tournamentType,
    officialBilling,
  });
  const tournamentUrl = surfaceUrls?.publicUrl ?? publicSportRoutes.tournament(sportSlug, slug);
  const inviteBase = surfaceUrls?.inviteUrl ?? publicSportRoutes.tournamentInvite(sportSlug, slug);

  if (kindParam === "player") {
    if (!allowPlayerInvites) {
      return (
        <InviteAcceptShell
          tournamentName={tournamentName}
          tournamentUrl={tournamentUrl}
          eyebrow="Player invitation"
          description="Player invites are not available for this tournament."
        >
          <div className="rounded-xl border border-dashed border-cp-border px-4 py-6 text-center text-sm text-cp-muted">
            This event only supports staff invites.
          </div>
          <Button asChild variant="outline" className="mt-4 w-full border-cp-border">
            <Link href={`${inviteBase}?kind=access${token ? `&token=${encodeURIComponent(token)}` : ""}`}>
              Go to staff invite
            </Link>
          </Button>
        </InviteAcceptShell>
      );
    }

    return (
      <PlayerInviteAcceptClient
        sportSlug={sportSlug}
        slug={slug}
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        surfaceUrls={surfaceUrls}
      />
    );
  }

  if (kindParam === "access") {
    return (
      <StaffInviteAcceptClient
        sportSlug={sportSlug}
        slug={slug}
        tournamentId={tournamentId}
        tournamentName={tournamentName}
        surfaceUrls={surfaceUrls}
      />
    );
  }

  // No kind in URL — choose a dedicated flow (no mixed dropdown).
  return (
    <InviteAcceptShell
      tournamentName={tournamentName}
      tournamentUrl={tournamentUrl}
      eyebrow="Invitation"
      description="Choose the invite type that matches the link or code from your host."
    >
      <div className="grid gap-3">
        <Link
          href={`${inviteBase}?kind=access${token ? `&token=${encodeURIComponent(token)}` : ""}`}
          className="flex items-start gap-3 rounded-xl border border-cp-border bg-cp-elevated/20 p-4 transition-colors hover:border-cp-primary/40 hover:bg-cp-primary/5"
        >
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Staff invite</p>
            <p className="mt-1 text-xs leading-relaxed text-cp-muted">
              Scorekeeper or bracket manager access for this tournament.
            </p>
          </div>
        </Link>

        {allowPlayerInvites ? (
          <Link
            href={`${inviteBase}?kind=player${token ? `&token=${encodeURIComponent(token)}` : ""}`}
            className="flex items-start gap-3 rounded-xl border border-cp-border bg-cp-elevated/20 p-4 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
          >
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Player invite</p>
              <p className="mt-1 text-xs leading-relaxed text-cp-muted">
                Join the tournament lobby with a player invite link or code.
              </p>
            </div>
          </Link>
        ) : null}
      </div>
    </InviteAcceptShell>
  );
}
