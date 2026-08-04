"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Loader2, ShieldCheck, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useCuratePartnerRegistration,
  usePartnerTournamentRegistrations,
} from "@/hooks/use-partner-tournament-registrations";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

function statusMeta(status: string) {
  if (status === "registered") {
    return {
      label: "Registered",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      hint: "Awaiting your confirmation",
    };
  }
  if (status === "awaiting_payment") {
    return {
      label: "Awaiting payment",
      className: "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-300",
      hint: "Guest still needs to pay",
    };
  }
  if (status === "confirmed") {
    return {
      label: "Confirmed",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
      hint: "Visible on public roster",
    };
  }
  return {
    label: status,
    className: "border-cp-border bg-cp-elevated text-cp-muted",
    hint: "",
  };
}

export function PartnerGuestRegistrationsPanel({
  sportSlug,
  slug,
  canCurate,
}: {
  sportSlug: string;
  slug: string;
  canCurate: boolean;
}) {
  const { confirm } = useConfirmDialog();
  const { data, isLoading, isError, error, refetch, isFetching } =
    usePartnerTournamentRegistrations(sportSlug, slug, canCurate);
  const curate = useCuratePartnerRegistration(sportSlug, slug);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = useMemo(
    () => (data ?? []).filter((r) => r.status === "registered" || r.status === "awaiting_payment"),
    [data],
  );
  const confirmed = useMemo(
    () => (data ?? []).filter((r) => r.status === "confirmed"),
    [data],
  );

  if (!canCurate) return null;

  const onConfirm = async (registrationId: string, teamName: string) => {
    const ok = await confirm({
      title: "Confirm this registration?",
      description: (
        <>
          Confirm <span className="font-medium text-foreground">&ldquo;{teamName}&rdquo;</span>{" "}
          for the public player list and live scoring roster.
        </>
      ),
      confirmLabel: "Confirm players",
    });
    if (!ok) return;
    setBusyId(registrationId);
    try {
      await curate.mutateAsync({ registrationId, action: "confirm" });
    } finally {
      setBusyId(null);
    }
  };

  const onDecline = async (registrationId: string, teamName: string) => {
    const ok = await confirm({
      title: "Decline this registration?",
      description: (
        <>
          Decline <span className="font-medium text-foreground">&ldquo;{teamName}&rdquo;</span>.
          They will not appear on the public roster.
        </>
      ),
      confirmLabel: "Decline",
      variant: "destructive",
    });
    if (!ok) return;
    setBusyId(registrationId);
    try {
      await curate.mutateAsync({ registrationId, action: "decline" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-cp-border bg-cp-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cp-primary" aria-hidden />
            <h3 className="text-base font-semibold text-foreground">Guest registrations</h3>
          </div>
          <p className="mt-1 text-sm text-cp-muted">
            New sign-ups stay <span className="font-medium text-foreground">Registered</span> until
            you confirm them. Only confirmed teams appear on the public Players tab.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-cp-border"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 flex justify-center py-8">
          <LoadingSpinner label="Loading registrations…" />
        </div>
      ) : isError ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load registrations"}
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">
              Needs review ({pending.length})
            </p>
            {pending.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-cp-border px-4 py-6 text-center text-sm text-cp-muted">
                No registrations waiting for confirmation.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-cp-border overflow-hidden rounded-xl border border-cp-border">
                {pending.map((reg) => {
                  const meta = statusMeta(reg.status);
                  const busy = busyId === reg.id && curate.isPending;
                  return (
                    <li
                      key={reg.id}
                      className="flex flex-col gap-3 px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{reg.teamName}</p>
                          <Badge className={cn("border", meta.className)}>{meta.label}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-cp-muted">{meta.hint}</p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {reg.members.map((m) => (
                            <li
                              key={`${reg.id}-${m.roleOrder}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-cp-border bg-cp-elevated/40 px-2 py-1 text-xs text-foreground"
                            >
                              <Users className="h-3 w-3 text-cp-muted" aria-hidden />
                              {m.fullName}
                              {m.isCaptain ? (
                                <span className="text-[10px] font-semibold uppercase text-cp-primary">
                                  Cap
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {reg.status === "registered" ? (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-cp-primary hover:bg-cp-primary-light"
                            disabled={busy}
                            onClick={() => void onConfirm(reg.id, reg.teamName)}
                          >
                            {busy ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Confirm
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={busy}
                            onClick={() => void onDecline(reg.id, reg.teamName)}
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" />
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs text-cp-muted">
                          <Clock className="h-3.5 w-3.5" />
                          Waiting for payment
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {confirmed.length > 0 ? (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cp-muted">
                Confirmed ({confirmed.length})
              </p>
              <p className="mt-1 text-xs text-cp-muted">
                These teams are on the public roster below.
              </p>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
