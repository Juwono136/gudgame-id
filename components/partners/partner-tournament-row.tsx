"use client";

import Link from "next/link";
import { PartnerStatusBadge } from "@/components/partners/partner-status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PartnerTournamentRowData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  sportName?: string | null;
  tournamentType?: string | null;
  venue?: string | null;
};

export function PartnerTournamentRow({
  tournament,
  href,
  publicHref,
  manageHref,
  editHref,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
  deleting = false,
  className,
}: {
  tournament: PartnerTournamentRowData;
  href?: string;
  publicHref?: string;
  manageHref?: string;
  editHref?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  deleting?: boolean;
  className?: string;
}) {
  const meta = [
    tournament.sportName,
    tournament.venue,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate font-medium text-foreground">{tournament.name}</p>
        <PartnerStatusBadge status={tournament.status} />
      </div>
      {meta ? <p className="mt-0.5 text-xs text-cp-muted">{meta}</p> : null}
    </div>
  );

  const hasActions = Boolean(publicHref || manageHref || editHref || onDelete);

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      {href && !hasActions ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
          {body}
          <span className="shrink-0 text-xs font-medium text-cp-primary">Open</span>
        </Link>
      ) : (
        <>
          {href ? (
            <Link href={href} className="min-w-0 flex-1 hover:opacity-90">
              {body}
            </Link>
          ) : (
            body
          )}
          {hasActions ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {publicHref ? (
                <Button asChild variant="outline" size="sm" className="border-cp-border">
                  <Link href={publicHref}>Public</Link>
                </Button>
              ) : null}
              {editHref ? (
                <Button asChild variant="outline" size="sm" className="border-cp-border">
                  <Link href={editHref}>Edit</Link>
                </Button>
              ) : null}
              {manageHref ? (
                <Button asChild size="sm" className="bg-cp-primary hover:bg-cp-primary-light">
                  <Link href={manageHref}>Manage</Link>
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={deleteDisabled || deleting}
                  title={deleteDisabled ? deleteDisabledReason : undefined}
                  onClick={onDelete}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </li>
  );
}
