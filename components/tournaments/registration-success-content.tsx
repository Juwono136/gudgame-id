"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PaymentReceiptActions } from "@/components/payments/payment-receipt-actions";
import { dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";

type RegistrationDetail = {
  registrationId: string;
  status: string;
  teamName: string | null;
  tournamentName: string;
  tournamentSlug: string;
  sportSlug: string;
  venue: string | null;
  categoryLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  paymentStatus: string | null;
  paymentId: string | null;
  invoiceUrl: string | null;
  amountIdr: number | null;
  paidAt: string | null;
  members: { displayName: string; userId: string }[];
};

function formatIdr(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type RegistrationSuccessContentProps = {
  registrationId: string;
  sportSlug: string;
  slug: string;
  /** Override hub URL (partner white-label). Defaults to Gud Game sport route. */
  hubHref?: string;
};

export function RegistrationSuccessContent({
  registrationId,
  sportSlug,
  slug,
  hubHref: hubHrefProp,
}: RegistrationSuccessContentProps) {
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const hubHref = `${hubHrefProp ?? publicSportRoutes.tournament(sportSlug, slug)}?registered=1`;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/tournaments/registrations/${registrationId}`);
        const json = await res.json();
        if (!cancelled && res.ok) {
          setDetail(json.data.registration);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  useEffect(() => {
    if (detail?.paymentStatus === "paid" || pollCount >= 12) return;
    const id = setInterval(() => {
      setPollCount((c) => c + 1);
      void fetch(`/api/tournaments/registrations/${registrationId}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.data?.registration) setDetail(j.data.registration);
        });
    }, 5000);
    return () => clearInterval(id);
  }, [detail?.paymentStatus, pollCount, registrationId]);

  const processing = detail?.paymentStatus === "pending";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
      >
        {processing ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <CheckCircle2 className="h-8 w-8" />
        )}
      </motion.div>

      <h1 className="mt-6 text-center text-2xl font-bold text-foreground">
        {processing ? "Processing payment…" : "Registration successful"}
      </h1>
      <p className="mt-2 text-center text-sm text-cp-muted">
        {processing
          ? "We're confirming your payment. This page will update automatically."
          : "You are officially registered. Your payment receipt is ready below."}
      </p>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner label="Loading details…" />
        </div>
      ) : detail ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl border border-cp-border bg-cp-card p-6 text-left"
        >
          <h2 className="text-sm font-semibold text-foreground">Tournament details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Event" value={detail.tournamentName} />
            {detail.startsAt ? (
              <Row
                label="Date"
                value={new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(detail.startsAt))}
              />
            ) : null}
            {detail.venue ? <Row label="Location" value={detail.venue} /> : null}
            {detail.categoryLabel ? <Row label="Category" value={detail.categoryLabel} /> : null}
            {detail.teamName ? <Row label="Team" value={detail.teamName} /> : null}
            {detail.members.length ? (
              <Row
                label="Players"
                value={detail.members.map((m) => m.displayName).join(" & ")}
              />
            ) : null}
            {detail.amountIdr ? (
              <Row label="Amount paid" value={formatIdr(detail.amountIdr)} />
            ) : null}
          </dl>
          {!processing && detail.paymentId ? (
            <div className="mt-6 border-t border-cp-border/60 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cp-primary">
                Official receipt
              </p>
              <PaymentReceiptActions paymentId={detail.paymentId} layout="stack" />
            </div>
          ) : null}
        </motion.div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="bg-cp-primary">
          <Link href={hubHref}>Back to tournament</Link>
        </Button>
        <Button asChild variant="outline" className="border-cp-border">
          <Link href={dashboardRoutes.payments}>Payment history</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-cp-border/50 pb-2">
      <dt className="text-cp-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
