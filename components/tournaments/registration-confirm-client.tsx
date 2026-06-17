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
  registrationId: number;
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
        description: "Proceed to checkout to complete payment.",
      });
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <LoadingOverlay show={submitting || cancelling} label="Processing…" />

      <Link href={hubHref} className="inline-flex items-center text-sm text-cp-muted hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to tournament
      </Link>

      <div className="mt-8 rounded-2xl border border-cp-border bg-cp-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-cp-primary">
          Step 1 of 2 — Confirm participation
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Confirm your team for {tournament.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-cp-muted">
          Payment is only processed after you confirm. Partners on your team are notified by email
          and in-app — only you need to confirm and pay.
        </p>

        <div className="mt-6 rounded-xl border border-cp-border bg-cp-elevated/40 p-4">
          <p className="text-sm text-cp-muted">Team name</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{teamName}</p>
          <p className="mt-3 text-sm text-cp-muted">Registration fee (after confirm)</p>
          <p className="mt-1 text-xl font-bold text-cp-primary">
            {formatIdr(tournament.registrationFeeIdr)}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            className="flex-1 bg-cp-primary hover:bg-cp-primary-light"
            disabled={submitting || cancelling}
            onClick={() => void confirmParticipation()}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Confirm & continue to payment
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-cp-border"
            disabled={submitting || cancelling}
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit team
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="mt-3 w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
          disabled={submitting || cancelling}
          onClick={() => void handleCancel()}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancel registration
        </Button>
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
