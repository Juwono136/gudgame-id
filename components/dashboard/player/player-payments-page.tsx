"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CreditCard, ExternalLink, Receipt } from "lucide-react";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useState } from "react";
import { usePlayerPayments, usePlayerRegistrations } from "@/hooks/use-player-payments";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";

type PlayerPaymentsPageProps = {
  roles: AppRole[];
};

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/20 text-emerald-300",
  pending: "bg-amber-500/20 text-amber-300",
  expired: "bg-slate-500/20 text-slate-400",
  failed: "bg-red-500/20 text-red-300",
  refunded: "bg-blue-500/20 text-blue-300",
};

const REG_FILTERS = ["all", "upcoming", "live", "completed"] as const;

export function PlayerPaymentsPage({ roles }: PlayerPaymentsPageProps) {
  const [regFilter, setRegFilter] = useState<(typeof REG_FILTERS)[number]>("all");
  const payments = usePlayerPayments();
  const registrations = usePlayerRegistrations();

  const loading = payments.isLoading || registrations.isLoading;

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title="Payments"
      description="Official tournament invoices and your registration history."
      breadcrumbs={[
        { label: "Overview", href: dashboardRoutes.home },
        { label: "Payments" },
      ]}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner label="Loading billing history…" />
        </div>
      ) : (
        <>
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <CreditCard className="h-5 w-5 text-cp-primary" />
              Payment history
            </h2>
            {payments.data?.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
                No payments yet. Official tournament fees will appear here.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {payments.data?.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-col gap-3 rounded-2xl border border-cp-border bg-cp-card p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{p.tournamentName}</p>
                      <p className="mt-1 text-sm text-cp-muted">
                        {formatIdr(p.amountIdr)} ·{" "}
                        {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                          new Date(p.createdAt),
                        )}
                      </p>
                      <Badge
                        className={`mt-2 border-0 capitalize ${PAYMENT_STATUS_STYLES[p.status] ?? "bg-cp-elevated"}`}
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.invoiceUrl && p.status === "pending" ? (
                        <Button asChild size="sm" className="bg-cp-primary hover:bg-cp-primary-light">
                          <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer">
                            <Receipt className="mr-2 h-4 w-4" />
                            Pay invoice
                          </a>
                        </Button>
                      ) : null}
                      <Button asChild variant="outline" size="sm" className="border-cp-border">
                        <Link
                          href={publicSportRoutes.tournament(p.sportSlug, p.tournamentSlug)}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Tournament
                        </Link>
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
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
            {registrations.data?.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-cp-border py-12 text-center text-sm text-cp-muted">
                No registrations yet. Join a reclub session or register for an official event.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
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
                  .map((r, i) => (
                  <motion.li
                    key={r.registrationId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border border-cp-border bg-cp-card/70 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
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
                        {r.status}
                      </Badge>
                      {r.paymentStatus ? (
                        <Badge variant="muted" className="capitalize">
                          {r.paymentStatus}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 font-semibold text-foreground">{r.tournamentName}</p>
                    {r.startsAt ? (
                      <p className="mt-1 text-xs text-cp-muted">
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(r.startsAt))}
                      </p>
                    ) : null}
                    <Button asChild variant="link" className="mt-2 h-auto p-0 text-cp-primary">
                      <Link href={publicSportRoutes.tournament(r.sportSlug, r.tournamentSlug)}>
                        View tournament →
                      </Link>
                    </Button>
                  </motion.li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </DashboardWorkspaceShell>
  );
}
