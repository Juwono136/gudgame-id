"use client";

import {
  CreditCard,
  LayoutGrid,
  Trophy,
  Users,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OFFICIAL_BILLING_LABELS } from "@/lib/tournaments/ui/labels";
import {
  getTournamentCourtCount,
  getTournamentScoringPrimaryLabel,
} from "@/lib/tournaments/settings";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

type ManageOfficialDashboardPanelProps = {
  tournament: TournamentDetail;
  summary: TournamentRegistrationSummary;
  className?: string;
};

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = "text-cp-primary",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-cp-border bg-cp-elevated/25 p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cp-primary/12",
            accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-cp-muted">{label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
          {detail ? <p className="mt-0.5 text-xs text-cp-muted">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ManageOfficialDashboardPanel({
  tournament,
  summary,
  className,
}: ManageOfficialDashboardPanelProps) {
  const courtCount = getTournamentCourtCount(tournament);
  const scoringPrimary = getTournamentScoringPrimaryLabel(tournament);
  const billingLabel =
    tournament.officialBilling === "paid"
      ? OFFICIAL_BILLING_LABELS.paid
      : OFFICIAL_BILLING_LABELS.free;
  const capacity =
    summary.maxTeams != null
      ? `${summary.registeredTeams} / ${summary.maxTeams}`
      : String(summary.registeredTeams);

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="border-cp-border bg-cp-elevated capitalize text-foreground">
          Official · {billingLabel}
        </Badge>
        <Badge variant="muted" className="capitalize">
          {tournament.format.replace(/_/g, " ")}
        </Badge>
        <Badge variant="muted" className="capitalize">
          {tournament.status}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Teams registered"
          value={capacity}
          detail={
            summary.spotsRemaining != null
              ? `${summary.spotsRemaining} spots remaining`
              : undefined
          }
        />
        <StatCard
          icon={UserRound}
          label="Players"
          value={String(summary.registeredPlayers)}
          detail={`${tournament.playersPerTeam} per team capacity`}
          accent="text-sky-400"
        />
        <StatCard
          icon={LayoutGrid}
          label="Courts & scoring"
          value={`${courtCount} courts`}
          detail={scoringPrimary}
          accent="text-violet-400"
        />
        <StatCard
          icon={tournament.officialBilling === "paid" ? CreditCard : Trophy}
          label={tournament.officialBilling === "paid" ? "Billing" : "Entry"}
          value={billingLabel}
          detail={
            tournament.officialBilling === "paid"
              ? "Payment status in Registrations"
              : "Free registration — no payment required"
          }
          accent={tournament.officialBilling === "paid" ? "text-amber-400" : "text-emerald-400"}
        />
      </div>

      {summary.registrationClosesAt ? (
        <p className="text-xs text-cp-muted">
          Registration closes{" "}
          {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
            new Date(summary.registrationClosesAt),
          )}
          {summary.registrationOpen ? "" : " · Registration closed"}
        </p>
      ) : null}
    </section>
  );
}
