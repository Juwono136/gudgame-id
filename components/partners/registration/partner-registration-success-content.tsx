"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type RegistrationDetail = {
  registration: {
    status: string;
    teamName: string;
  };
  members: { fullName: string; isCaptain: boolean; roleOrder: number }[];
  tournament: { name: string; venue: string | null };
  tournamentUrl: string;
  payUrl: string;
  receiptUrl: string | null;
};

export function PartnerRegistrationSuccessContent({
  partnerSlug,
  tournamentSlug,
  token,
}: {
  partnerSlug: string;
  tournamentSlug: string;
  token: string | null;
}) {
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing registration token.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/partner/public/${partnerSlug}/tournaments/${tournamentSlug}/register/${token}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Registration not found");
        setDetail(json.data as RegistrationDetail);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Registration not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [partnerSlug, tournamentSlug, token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading your registration…" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-foreground">{error ?? "This registration link is invalid."}</p>
      </div>
    );
  }

  if (detail.registration.status === "awaiting_payment") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-center">
        <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-foreground">Payment still pending</p>
          <p className="mt-1 text-sm text-cp-muted">
            Complete payment to confirm team &quot;{detail.registration.teamName}&quot;.
          </p>
        </div>
        <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
          <Link href={detail.payUrl}>Complete payment</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cp-border bg-cp-card text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">You&apos;re registered!</h1>
        <p className="max-w-md text-sm text-cp-muted">
          Team <span className="font-medium text-foreground">{detail.registration.teamName}</span>{" "}
          is confirmed for {detail.tournament.name}
          {detail.tournament.venue ? ` at ${detail.tournament.venue}` : ""}.
        </p>
      </div>

      {detail.members.length ? (
        <div className="mx-auto max-w-sm rounded-2xl border border-cp-border bg-cp-card p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">Roster</p>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {detail.members
              .slice()
              .sort((a, b) => a.roleOrder - b.roleOrder)
              .map((m) => (
                <li key={m.roleOrder} className="flex items-center justify-between gap-2">
                  <span>{m.fullName}</span>
                  {m.isCaptain ? (
                    <span className="rounded-full bg-cp-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-cp-primary">
                      Captain
                    </span>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
          <Link href={detail.tournamentUrl}>View tournament page</Link>
        </Button>
        {detail.receiptUrl ? (
          <Button asChild variant="outline" className="border-cp-border">
            <Link href={detail.receiptUrl}>View receipt</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
