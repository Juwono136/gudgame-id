"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CreditCard, Loader2, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { PlayerSearchPicker } from "@/components/tournaments/player-search-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentDetail } from "@/lib/tournaments/service";
import type { TournamentPlayerSearchResult } from "@/lib/tournaments/players/search";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "team", label: "Team" },
  { id: "partners", label: "Partners" },
  { id: "payment", label: "Payment" },
] as const;

function formatIdr(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type OfficialRegistrationWizardProps = {
  tournament: TournamentDetail;
};

export function OfficialRegistrationWizard({ tournament }: OfficialRegistrationWizardProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [partners, setPartners] = useState<TournamentPlayerSearchResult[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const hubHref = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
  const processingFeeEstimate = Math.round((tournament.registrationFeeIdr ?? 0) * 0.0125);

  const goNext = () => {
    if (step === 0 && !teamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const handleSubmit = async () => {
    const ok = await confirm({
      title: "Confirm registration & payment?",
      description: `You will be redirected to Xendit to pay ${formatIdr(tournament.registrationFeeIdr)} for team "${teamName.trim()}".`,
      confirmLabel: "Continue to payment",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamName: teamName.trim(),
            memberUserIds: partners.map((p) => p.userId),
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Registration failed");

      const invoiceUrl = json.data?.invoiceUrl as string | undefined;
      if (invoiceUrl) {
        window.location.href = invoiceUrl;
        return;
      }
      toast.success("Registration created");
      router.push(hubHref);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LoadingOverlay show={submitting} label="Creating invoice…" />

      <div className="flex items-center justify-between">
        <Link href={hubHref} className="inline-flex items-center text-sm text-cp-muted hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Cancel
        </Link>
        <p className="text-sm font-medium text-foreground">Complete registration</p>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                i <= step ? "bg-cp-primary text-white" : "bg-cp-elevated text-cp-muted",
              )}
            >
              {i + 1}
            </div>
            <span className={cn("text-sm", i <= step ? "text-foreground" : "text-cp-muted")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 ? (
              <div className="mx-2 hidden h-px w-8 bg-cp-border sm:block" />
            ) : null}
          </div>
        ))}
      </div>

      <h1 className="mt-8 text-2xl font-bold text-foreground">Secure your spot</h1>
      <p className="mt-1 text-sm text-cp-muted">{tournament.name}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="rounded-2xl border border-cp-border bg-cp-card p-6"
          >
            {step === 0 ? (
              <>
                <div className="flex items-center gap-2 text-cp-primary">
                  <Users className="h-5 w-5" />
                  <h2 className="font-semibold text-foreground">Team registration</h2>
                </div>
                <div className="mt-6">
                  <Label>Team name *</Label>
                  <Input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter your team name"
                    className="mt-1.5 border-cp-border bg-cp-bg-input"
                  />
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h2 className="font-semibold text-foreground">Invite partners</h2>
                <p className="mt-1 text-sm text-cp-muted">
                  You are registered as team captain. Add up to{" "}
                  {Math.max(0, tournament.playersPerTeam - 1)} partner(s).
                </p>
                <div className="mt-4">
                  <PlayerSearchPicker
                    sportSlug={tournament.sportSlug}
                    selected={partners}
                    onChange={setPartners}
                    maxSelections={Math.max(0, tournament.playersPerTeam - 1)}
                  />
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2 className="font-semibold text-foreground">Review & pay</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-cp-muted">Team</dt>
                    <dd className="font-medium">{teamName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-cp-muted">Partners</dt>
                    <dd className="font-medium">
                      {partners.length
                        ? partners.map((p) => p.displayName).join(", ")
                        : "Solo captain"}
                    </dd>
                  </div>
                </dl>
              </>
            ) : null}
          </motion.section>
        </AnimatePresence>

        <aside className="rounded-2xl border border-cp-primary/30 bg-cp-card p-6 lg:sticky lg:top-24 lg:self-start">
          <h3 className="text-sm font-semibold text-foreground">Order summary</h3>
          <p className="mt-1 text-xs text-cp-muted">{tournament.sportName}</p>
          <p className="mt-4 text-2xl font-bold text-cp-primary">
            {formatIdr(tournament.registrationFeeIdr)}
          </p>
          {processingFeeEstimate > 0 ? (
            <p className="text-xs text-cp-muted">
              + est. processing {formatIdr(processingFeeEstimate)}
            </p>
          ) : null}
          <p className="mt-4 flex items-center gap-1 text-[10px] text-cp-text-dim">
            <Shield className="h-3 w-3" />
            Encrypted & secure via Xendit
          </p>
          {step < STEPS.length - 1 ? (
            <Button className="mt-6 w-full bg-cp-primary" onClick={goNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="mt-6 w-full bg-cp-primary hover:bg-cp-primary-light"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Confirm & pay
            </Button>
          )}
        </aside>
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          className="border-cp-border"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
