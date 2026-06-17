"use client";

import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { PaymentTransactionsLedger } from "@/components/payments/payment-transactions-ledger";
import { usePlayerRegistrations } from "@/hooks/use-player-payments";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import type { PaymentTransactionRow } from "@/lib/tournaments/payments/transaction-types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";

type PlayerPaymentsPageProps = {
  roles: AppRole[];
};

const REG_FILTERS = ["all", "upcoming", "live", "completed"] as const;

export function PlayerPaymentsPage({ roles }: PlayerPaymentsPageProps) {
  const router = useRouter();
  const [regFilter, setRegFilter] = useState<(typeof REG_FILTERS)[number]>("all");
  const registrations = usePlayerRegistrations();

  const handlePay = (row: PaymentTransactionRow) => {
    router.push(
      `/sports/${row.sportSlug}/tournaments/${row.tournamentSlug}/register/checkout?registrationId=${row.registrationId}`,
    );
  };

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title="Payments"
      description="Official tournament invoices, receipts, and your registration history."
      breadcrumbs={[
        { label: "Overview", href: dashboardRoutes.home },
        { label: "Payments" },
      ]}
    >
      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <CreditCard className="h-5 w-5 text-cp-primary" />
          Payment history
        </h2>
        <div className="mt-4">
          <PaymentTransactionsLedger
            apiPath="/api/account/player/payments"
            scope="player"
            onPayPending={handlePay}
          />
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">My registrations</h2>
          <div className="flex gap-1 rounded-lg border border-cp-border p-1">
            {REG_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setRegFilter(f)}
                className={`rounded-md px-3 py-1 text-xs capitalize ${
                  regFilter === f
                    ? "bg-cp-primary/15 text-cp-primary"
                    : "text-cp-muted hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {registrations.isLoading ? (
          <p className="mt-4 text-sm text-cp-muted">Loading registrations…</p>
        ) : registrations.data?.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
            No registrations yet.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {registrations.data
              ?.filter((r) => {
                if (regFilter === "all") return true;
                const now = Date.now();
                const start = r.startsAt ? new Date(r.startsAt).getTime() : null;
                const end = r.endsAt ? new Date(r.endsAt).getTime() : null;
                if (regFilter === "upcoming") return start != null && start > now;
                if (regFilter === "live")
                  return start != null && start <= now && (end == null || end >= now);
                if (regFilter === "completed") return end != null && end < now;
                return true;
              })
              .map((r) => (
                <li
                  key={r.registrationId}
                  className="rounded-2xl border border-cp-border bg-cp-card/70 p-5"
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={
                        r.tournamentType === "official"
                          ? "border-0 bg-cp-primary/20 text-cp-primary"
                          : "border-0 bg-emerald-500/20 text-emerald-300"
                      }
                    >
                      {r.tournamentType === "official" ? "Official" : "Reclub"}
                    </Badge>
                    <Badge variant="muted" className="capitalize">
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{r.tournamentName}</p>
                  <Link
                    href={publicSportRoutes.tournament(r.sportSlug, r.tournamentSlug)}
                    className="mt-2 inline-block text-sm text-cp-primary hover:underline"
                  >
                    View tournament →
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </DashboardWorkspaceShell>
  );
}
