"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatIdrDisplay } from "@/lib/format/currency";
import { CHECKOUT_PAYMENT_METHODS } from "@/lib/tournaments/payments/checkout-methods";
import { cn } from "@/lib/utils";

type RegistrationDetail = {
  registration: {
    id: string;
    status: string;
    teamName: string;
    feeIdr: number | null;
    paymentDueAt: string | null;
  };
  payment: { status: string; invoiceUrl: string | null; amountIdr: number | null } | null;
  tournament: { name: string; slug: string };
  payUrl: string;
  successUrl: string;
  tournamentUrl: string;
};

type PaymentInstructions = {
  method: string;
  amountIdr: number;
  expiresAt: string | null;
  qris?: { qrString: string; qrId: string };
  bankTransfer?: { accountNumber: string; bankCode: string; accountName: string };
  ewalletRedirectUrl?: string;
};

const METHOD_ICONS: Record<string, typeof QrCode> = {
  qris: QrCode,
  bank_transfer: Building2,
  ewallet: Smartphone,
  card: CreditCard,
};

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function PartnerRegistrationPayClient({
  partnerSlug,
  tournamentSlug,
  token,
}: {
  partnerSlug: string;
  tournamentSlug: string;
  token: string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [polling, setPolling] = useState(false);

  const basePath = `/api/partner/public/${partnerSlug}/tournaments/${tournamentSlug}/register/${token}`;

  const loadDetail = useCallback(async () => {
    const res = await fetch(basePath);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Failed to load registration");
    setDetail(json.data as RegistrationDetail);
    return json.data as RegistrationDetail;
  }, [basePath]);

  useEffect(() => {
    void loadDetail()
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load registration"))
      .finally(() => setLoading(false));
  }, [loadDetail]);

  useEffect(() => {
    if (detail?.registration.status === "confirmed") {
      router.replace(detail.successUrl);
    }
  }, [detail, router]);

  const pollStatus = useCallback(() => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const data = await loadDetail();
        if (data.registration.status === "confirmed") {
          clearInterval(interval);
          setPolling(false);
          toast.success("Payment received!");
          router.push(data.successUrl);
        }
        if (data.registration.status === "expired" || data.registration.status === "cancelled") {
          clearInterval(interval);
          setPolling(false);
        }
      } catch {
        /* ignore poll errors */
      }
    }, 4000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [loadDetail, router]);

  useEffect(() => {
    if (!instructions || instructions.method === "ewallet" || instructions.method === "card") {
      return;
    }
    return pollStatus();
  }, [instructions, pollStatus]);

  const initiatePayment = async (method: string) => {
    setProcessing(true);
    setSelectedMethod(method);
    setInstructions(null);
    try {
      const res = await fetch(`${basePath}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, defaultBank: "BCA" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Payment setup failed");

      const inst = json.data as PaymentInstructions;
      if (inst.ewalletRedirectUrl && (method === "ewallet" || method === "card")) {
        window.open(inst.ewalletRedirectUrl, "_blank", "noopener,noreferrer");
      }
      setInstructions(inst);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
      setSelectedMethod(null);
    } finally {
      setProcessing(false);
    }
  };

  const copyText = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Loading payment details…" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-foreground">
        This registration link is invalid or has expired.
      </div>
    );
  }

  if (detail.registration.status === "expired" || detail.registration.status === "cancelled") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-foreground">Registration window closed</p>
          <p className="mt-1 text-sm text-cp-muted">
            The payment deadline passed and this slot was released.
          </p>
        </div>
        <Button asChild className="bg-cp-primary hover:bg-cp-primary-light">
          <Link href={detail.tournamentUrl}>Back to tournament</Link>
        </Button>
      </div>
    );
  }

  const amount = detail.payment?.amountIdr ?? detail.registration.feeIdr ?? 0;
  const deadline = formatDeadline(detail.registration.paymentDueAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-cp-border bg-cp-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
            Team {detail.registration.teamName}
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatIdrDisplay(amount)}</p>
        </div>
        {deadline ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cp-border bg-cp-elevated/40 px-3 py-1.5 text-xs text-cp-muted">
            <Clock className="h-3.5 w-3.5 shrink-0 text-cp-primary" aria-hidden />
            Pay by <span className="font-medium text-foreground">{deadline}</span>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
        {!instructions ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CHECKOUT_PAYMENT_METHODS.map((m) => {
              const Icon = METHOD_ICONS[m.id] ?? CreditCard;
              const active = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={processing}
                  onClick={() => void initiatePayment(m.id)}
                  className={cn(
                    "group flex min-h-[5.5rem] items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-cp-primary bg-cp-primary/10"
                      : "border-cp-border bg-cp-elevated/30 hover:border-cp-primary/40",
                    processing && "pointer-events-none opacity-60",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cp-border bg-cp-card">
                    <Icon className="h-5 w-5 text-cp-primary" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-foreground">{m.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-cp-muted">
                      {m.description}
                    </span>
                  </span>
                  {active && processing ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cp-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-5">
            {instructions.qris?.qrString ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-cp-border bg-cp-elevated/30 p-5">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(instructions.qris.qrString)}`}
                  alt="QRIS payment code"
                  width={220}
                  height={220}
                  className="rounded-lg border border-cp-border bg-white p-2 shadow-sm"
                  unoptimized
                />
                <p className="max-w-sm text-center text-sm text-cp-muted">
                  Scan with any QRIS-compatible app. Payment confirms automatically.
                </p>
              </div>
            ) : null}

            {instructions.bankTransfer ? (
              <div className="space-y-3 rounded-xl border border-cp-border bg-cp-elevated/30 p-4 sm:p-5">
                <p className="text-sm font-semibold text-foreground">Virtual account transfer</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-cp-border bg-cp-card px-3 py-2.5 text-sm">
                    <span className="text-cp-muted">Bank</span>
                    <span className="font-medium text-foreground">
                      {instructions.bankTransfer.bankCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-cp-border bg-cp-card px-3 py-2.5 text-sm sm:col-span-2">
                    <span className="shrink-0 text-cp-muted">Account</span>
                    <button
                      type="button"
                      className="inline-flex min-w-0 items-center gap-1.5 font-mono text-sm font-semibold text-cp-primary hover:underline"
                      onClick={() =>
                        copyText(instructions.bankTransfer!.accountNumber, "Account number")
                      }
                    >
                      <span className="truncate">{instructions.bankTransfer.accountNumber}</span>
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-cp-muted">
                  Transfer exactly{" "}
                  <span className="font-medium text-foreground">
                    {formatIdrDisplay(instructions.amountIdr)}
                  </span>{" "}
                  to {instructions.bankTransfer.accountName}.
                </p>
              </div>
            ) : null}

            {instructions.ewalletRedirectUrl ? (
              <div className="rounded-xl border border-cp-border bg-cp-elevated/30 p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-cp-muted">
                  Complete payment in the secure window. Return here when finished.
                </p>
                <Button
                  size="sm"
                  className="mt-3 h-10 bg-cp-primary hover:bg-cp-primary-light"
                  onClick={() =>
                    window.open(instructions.ewalletRedirectUrl!, "_blank", "noopener,noreferrer")
                  }
                >
                  Re-open payment window
                </Button>
              </div>
            ) : null}

            {polling ? (
              <p className="flex items-center gap-2 rounded-lg border border-cp-border bg-cp-elevated/30 px-3 py-2.5 text-xs text-cp-muted">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cp-primary" />
                Waiting for payment confirmation…
              </p>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full border-cp-border sm:w-auto"
              onClick={() => {
                setInstructions(null);
                setSelectedMethod(null);
              }}
            >
              Change payment method
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-cp-muted">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cp-primary" />
        No account needed — this link is unique to your registration.
      </div>
    </div>
  );
}
