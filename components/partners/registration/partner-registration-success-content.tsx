"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type RegistrationDetail = {
  registration: {
    status: string;
    teamName: string;
    feeIdr: number | null;
  };
  members: { fullName: string; isCaptain: boolean; roleOrder: number }[];
  payment: { status: string } | null;
  tournament: { name: string; venue: string | null };
  tournamentUrl: string;
  registerUrl: string;
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
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePath = token
    ? `/api/partner/public/${partnerSlug}/tournaments/${tournamentSlug}/register/${token}`
    : null;

  useEffect(() => {
    if (!token || !basePath) {
      setError("Missing registration token.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(basePath);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Registration not found");
        setDetail(json.data as RegistrationDetail);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Registration not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [basePath, token]);

  const canGuestCancel =
    detail?.registration.status === "registered" && detail.payment?.status !== "paid";

  const handleCancelRegistration = async () => {
    if (!detail || !basePath || !canGuestCancel) return;

    const ok = await confirm({
      title: "Cancel registration?",
      description: detail.registration.teamName
        ? `Team "${detail.registration.teamName}" will be removed and your slot released. You can register again if spots remain.`
        : "Your registration will be cancelled and the slot released. You can register again if spots remain.",
      confirmLabel: "Cancel registration",
      cancelLabel: "Keep registration",
      variant: "destructive",
    });
    if (!ok) return;

    setCancelling(true);
    try {
      const res = await fetch(basePath, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: { registerUrl?: string; tournamentUrl?: string };
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Could not cancel registration");
      }

      toast.success("Registration cancelled", {
        description: "Your slot was released. You can register again if spots remain.",
      });

      router.push(json?.data?.registerUrl ?? detail.registerUrl ?? detail.tournamentUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel registration");
    } finally {
      setCancelling(false);
    }
  };

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

  if (detail.registration.status === "expired" || detail.registration.status === "cancelled") {
    const wasCancelled = detail.registration.status === "cancelled";
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-foreground">
            {wasCancelled ? "Registration cancelled" : "Registration window closed"}
          </p>
          <p className="mt-1 text-sm text-cp-muted">
            {wasCancelled
              ? "This registration was released. You can register again if spots remain."
              : "This registration is no longer active."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
            <Link href={detail.registerUrl || detail.tournamentUrl}>Register again</Link>
          </Button>
          <Button asChild variant="outline" className="border-cp-border">
            <Link href={detail.tournamentUrl}>Back to tournament</Link>
          </Button>
        </div>
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
            Complete payment for team &quot;{detail.registration.teamName}&quot;. After payment,
            the organizer will confirm your spot.
          </p>
        </div>
        <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
          <Link href={detail.payUrl}>Complete payment</Link>
        </Button>
      </div>
    );
  }

  if (detail.registration.status === "registered") {
    return (
      <>
        {cancelling ? <LoadingOverlay show label="Cancelling registration…" /> : null}
        <div className="space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              You&apos;re registered
            </h1>
            <p className="max-w-md text-sm text-cp-muted">
              Team <span className="font-medium text-foreground">{detail.registration.teamName}</span>{" "}
              is registered for {detail.tournament.name}. The organizer will review and confirm your
              spot before you appear on the public player list.
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

          <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
            <Button asChild variant="outline" className="border-cp-border">
              <Link href={detail.tournamentUrl}>Back to tournament</Link>
            </Button>
            {canGuestCancel ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                disabled={cancelling}
                onClick={() => void handleCancelRegistration()}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4 shrink-0" />
                    Cancel registration
                  </>
                )}
              </Button>
            ) : null}
            {canGuestCancel ? (
              <p className="text-xs text-cp-muted">
                You can cancel anytime before the organizer confirms your team, then register again
                if spots remain.
              </p>
            ) : (
              <p className="text-xs text-cp-muted">
                This registration is paid. Contact the organizer if you need changes.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cp-border bg-cp-card text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">You&apos;re confirmed!</h1>
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
