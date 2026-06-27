"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import { OfficialRegistrationEditDialog } from "@/components/tournaments/official-registration-edit-dialog";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useCancelRegistration } from "@/hooks/use-cancel-registration";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

function formatIdr(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type RegistrationConfirmClientProps = {
  tournament: TournamentDetail;
  registrationId: string;
  teamName: string;
};

export function RegistrationConfirmClient({
  tournament,
  registrationId,
  teamName,
}: RegistrationConfirmClientProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const { cancelRegistration, isPending: cancelling } = useCancelRegistration();
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const hubHref = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);

  const confirmParticipation = async () => {
    const ok = await confirm({
      title: "Confirm you will compete?",
      description: `Team "${teamName}" will be locked in for ${tournament.name}. After confirming, you must complete payment to secure your slot.`,
      confirmLabel: "Yes, I'm competing",
      cancelLabel: "Not yet",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const params = new URLSearchParams({
        sportSlug: tournament.sportSlug,
        slug: tournament.slug,
      });
      const res = await fetch(
        `/api/tournaments/registrations/${registrationId}/confirm?${params}`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not confirm");

      toast.success("Participation confirmed", {
        description:
          json.data?.status === "confirmed"
            ? "Your team is registered for this event."
            : "Proceed to checkout to complete payment.",
      });
      if (json.data?.status === "confirmed") {
        router.push(`${hubHref}?registered=1`);
        return;
      }
      const checkoutUrl = json.data?.checkoutUrl as string | undefined;
      router.push(checkoutUrl ?? `${hubHref}/register/checkout?registrationId=${registrationId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Confirmation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    await cancelRegistration({
      registrationId,
      sportSlug: tournament.sportSlug,
      slug: tournament.slug,
      teamName,
      redirectTo: hubHref,
    });
  };

  const busy = submitting || cancelling;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <LoadingOverlay show={busy} label="Processing…" />

      <Link
        href={hubHref}
        className="inline-flex items-center gap-1.5 text-sm text-cp-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Back to tournament
      </Link>

      <div className="mt-6 overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card sm:mt-8">
        <div className="border-b border-cp-border bg-cp-elevated/30 px-5 py-6 sm:px-8 sm:py-7">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-cp-primary">
            Step 1 of 2 — Confirm participation
          </p>
          <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Confirm your team for {tournament.name}
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-cp-muted">
            Payment is only processed after you confirm. Partners on your team are notified by email
            and in-app — only you need to confirm and pay.
          </p>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-7">
          <div className="grid gap-4 rounded-xl border border-cp-border bg-cp-elevated/40 p-4 sm:grid-cols-2 sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">Team name</p>
              <p className="mt-1.5 truncate text-lg font-semibold text-foreground">{teamName}</p>
            </div>
            <div className="min-w-0 sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">
                Registration fee (after confirm)
              </p>
              <p className="mt-1.5 text-xl font-bold text-cp-primary sm:text-2xl">
                {formatIdr(tournament.registrationFeeIdr)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className={cn(
                "h-11 w-full bg-cp-primary text-sm font-semibold hover:bg-cp-primary-light",
                "sm:h-12 sm:text-base",
              )}
              disabled={busy}
              onClick={() => void confirmParticipation()}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" />
              )}
              Confirm & continue to payment
            </Button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <Button
                variant="outline"
                className="h-11 w-full border-cp-border bg-cp-elevated/30 text-sm font-medium sm:h-12"
                disabled={busy}
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4 shrink-0" />
                Edit team
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-red-500/30 text-sm font-medium text-red-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 sm:h-12"
                disabled={busy}
                onClick={() => void handleCancel()}
              >
                {cancelling ? (
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4 shrink-0" />
                )}
                Cancel registration
              </Button>
            </div>
          </div>
        </div>
      </div>

      <OfficialRegistrationEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        registrationId={registrationId}
        sportSlug={tournament.sportSlug}
        tournamentSlug={tournament.slug}
        tournamentName={tournament.name}
      />
    </div>
  );
}
