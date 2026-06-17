"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useCancelRegistration } from "@/hooks/use-cancel-registration";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { publicSportRoutes } from "@/lib/constants/routes";
import { formatIdrDisplay } from "@/lib/format/currency";
import { CHECKOUT_PAYMENT_METHODS } from "@/lib/tournaments/payments/checkout-methods";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

type RegistrationCheckoutClientProps = {
  tournament: TournamentDetail;
  registrationId: number;
};

type CheckoutDetail = {
  teamName: string | null;
  status: string;
  amountIdr: number | null;
  platformFeeIdr: number | null;
  processingFeeIdr: number | null;
  registrationFeeIdr: number | null;
  paymentStatus: string | null;
  paymentDueAt: string | null;
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

export function RegistrationCheckoutClient({
  tournament,
  registrationId,
}: RegistrationCheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useConfirmDialog();
  const { cancelRegistration, isPending: cancelling } = useCancelRegistration();
  const failed = searchParams.get("failed") === "1";
  const hubHref = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
  const registerHref = `${hubHref}/register`;

  const [detail, setDetail] = useState<CheckoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [polling, setPolling] = useState(false);

  const loadDetail = useCallback(async () => {
    const res = await fetch(`/api/tournaments/registrations/${registrationId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Failed to load checkout");
    setDetail(json.data.registration);
    return json.data.registration as CheckoutDetail;
  }, [registrationId]);

  useEffect(() => {
    void loadDetail().finally(() => setLoading(false));
  }, [loadDetail]);

  useEffect(() => {
    if (failed) {
      toast.error("Payment was not completed", {
        description: "Your team slot is still reserved. Choose a method and try again.",
      });
      router.replace(`${hubHref}/register/checkout?registrationId=${registrationId}`, {
        scroll: false,
      });
    }
  }, [failed, hubHref, registrationId, router]);

  const pollPaymentStatus = useCallback(() => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tournaments/registrations/${registrationId}/payment-status`);
        const json = await res.json();
        if (json.data?.paid) {
          clearInterval(interval);
          setPolling(false);
          toast.success("Payment received!", { description: "Your registration is confirmed." });
          router.push(`${hubHref}/register/success?registrationId=${registrationId}`);
          return;
        }
        if (json.data?.expired || json.data?.registrationStatus === "cancelled") {
          clearInterval(interval);
          setPolling(false);
          void loadDetail();
          toast.error("Payment window closed", {
            description: "Your registration was cancelled. You can register again if slots remain.",
          });
        }
      } catch {
        /* ignore poll errors */
      }
    }, 4000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [registrationId, hubHref, router, loadDetail]);

  useEffect(() => {
    if (!instructions || instructions.method === "ewallet" || instructions.method === "card") {
      return;
    }
    return pollPaymentStatus();
  }, [instructions, pollPaymentStatus]);

  const registrationFee = detail?.registrationFeeIdr ?? tournament.registrationFeeIdr ?? 0;
  const processingFee = detail?.processingFeeIdr ?? Math.round(registrationFee * 0.0125);
  const total = detail?.amountIdr ?? registrationFee + processingFee;
  const paymentDeadline = formatDeadline(detail?.paymentDueAt ?? null);

  const paymentFailed = detail?.paymentStatus === "failed";
  const paymentExpired = detail?.paymentStatus === "expired";
  const registrationCancelled = detail?.status === "cancelled";

  const initiatePayment = async (method: string) => {
    const ok = await confirm({
      title: "Proceed with payment?",
      description: `You will pay ${formatIdrDisplay(total)} for team "${detail?.teamName ?? "your team"}".`,
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setProcessing(true);
    setSelectedMethod(method);
    setInstructions(null);
    try {
      const res = await fetch(`/api/tournaments/registrations/${registrationId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          sportSlug: tournament.sportSlug,
          slug: tournament.slug,
          bankCode: "BCA",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Payment setup failed");

      const inst = json.data.instructions as PaymentInstructions;

      if (inst.ewalletRedirectUrl && (method === "ewallet" || method === "card")) {
        const openOk = await confirm({
          title: "Open secure payment window?",
          description:
            "E-wallet and card payments open a secure Xendit window. You will return here automatically after payment.",
          confirmLabel: "Open payment",
          cancelLabel: "Cancel",
        });
        if (openOk) {
          window.open(inst.ewalletRedirectUrl, "_blank", "noopener,noreferrer");
          setInstructions(inst);
        }
        return;
      }

      setInstructions(inst);
      toast.success("Payment instructions ready", {
        description: "Complete the payment below — no Xendit email will be sent.",
      });
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

  const retryCheckout = () => {
    setInstructions(null);
    setSelectedMethod(null);
    void loadDetail();
  };

  const cancelRegistrationHandler = async () => {
    await cancelRegistration({
      registrationId,
      sportSlug: tournament.sportSlug,
      slug: tournament.slug,
      teamName: detail?.teamName,
      redirectTo: hubHref,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading checkout…" />
      </div>
    );
  }

  if (detail?.paymentStatus === "paid" || detail?.status === "confirmed") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Payment complete</h1>
        <Button asChild className="mt-6 bg-cp-primary">
          <Link href={hubHref}>Back to tournament</Link>
        </Button>
      </div>
    );
  }

  if (registrationCancelled || paymentExpired) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Registration cancelled</h1>
        <p className="mt-2 text-sm text-cp-muted">
          The payment window has closed and your team slot was released.
          {paymentDeadline ? ` Deadline was ${paymentDeadline}.` : null}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="border-cp-border">
            <Link href={hubHref}>Back to tournament</Link>
          </Button>
          <Button asChild className="bg-cp-primary">
            <Link href={registerHref}>Register again</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LoadingOverlay show={processing || cancelling} label="Processing…" />

      <Link href={hubHref} className="inline-flex items-center text-sm text-cp-muted hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to tournament
      </Link>

      {paymentFailed ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Previous payment did not complete</p>
            <p className="mt-1 text-xs text-cp-muted">
              Your team slot is still reserved. Select a payment method below to try again
              {paymentDeadline ? ` before ${paymentDeadline}` : ""}.
            </p>
            <Button size="sm" variant="outline" className="mt-3 border-cp-border" onClick={retryCheckout}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {paymentDeadline ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cp-border bg-cp-card/60 px-3 py-2 text-xs text-cp-muted">
          <Clock className="h-3.5 w-3.5 text-cp-primary" />
          Complete payment by <span className="font-medium text-foreground">{paymentDeadline}</span>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-cp-primary">
            Secure checkout · TandingBase
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            Choose payment method
          </h1>
          <p className="mt-2 text-sm text-cp-muted">
            {tournament.name} · Team {detail?.teamName ?? "—"}
          </p>

          {!instructions ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                      "flex flex-col items-start rounded-xl border p-4 text-left transition-colors",
                      active
                        ? "border-cp-primary bg-cp-primary/10"
                        : "border-cp-border bg-cp-card/60 hover:border-cp-primary/40",
                    )}
                  >
                    <Icon className="h-5 w-5 text-cp-primary" />
                    <span className="mt-2 font-medium text-foreground">{m.label}</span>
                    <span className="mt-1 text-xs text-cp-muted">{m.description}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 space-y-4 rounded-xl border border-cp-border bg-cp-card/80 p-5">
              {instructions.qris?.qrString ? (
                <div className="flex flex-col items-center gap-4">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(instructions.qris.qrString)}`}
                    alt="QRIS payment code"
                    width={220}
                    height={220}
                    className="rounded-lg border border-cp-border bg-white p-2"
                    unoptimized
                  />
                  <p className="text-center text-sm text-cp-muted">
                    Scan with any QRIS-compatible app. We will confirm automatically.
                  </p>
                </div>
              ) : null}

              {instructions.bankTransfer ? (
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">Virtual account transfer</p>
                  <div className="flex items-center justify-between rounded-lg bg-cp-elevated/50 px-3 py-2">
                    <span className="text-cp-muted">Bank</span>
                    <span className="font-medium">{instructions.bankTransfer.bankCode}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-cp-elevated/50 px-3 py-2">
                    <span className="text-cp-muted">Account</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-mono font-medium text-cp-primary"
                      onClick={() =>
                        copyText(instructions.bankTransfer!.accountNumber, "Account number")
                      }
                    >
                      {instructions.bankTransfer.accountNumber}
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-cp-muted">
                    Transfer exactly {formatIdrDisplay(instructions.amountIdr)} to the name{" "}
                    {instructions.bankTransfer.accountName}.
                  </p>
                </div>
              ) : null}

              {instructions.ewalletRedirectUrl ? (
                <div className="text-sm text-cp-muted">
                  <p>Complete payment in the secure window. Return here when finished.</p>
                  <Button
                    size="sm"
                    className="mt-3 bg-cp-primary"
                    onClick={() =>
                      window.open(instructions.ewalletRedirectUrl!, "_blank", "noopener,noreferrer")
                    }
                  >
                    Re-open payment window
                  </Button>
                </div>
              ) : null}

              {polling ? (
                <p className="flex items-center gap-2 text-xs text-cp-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Waiting for payment confirmation…
                </p>
              ) : null}

              <Button variant="outline" size="sm" className="border-cp-border" onClick={retryCheckout}>
                Change payment method
              </Button>
            </div>
          )}
        </div>

        <aside className="lg:col-span-2">
          <div className="rounded-xl border border-cp-border bg-cp-card/80 p-5">
            <h2 className="text-sm font-semibold text-foreground">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-cp-muted">Registration fee</dt>
                <dd>{formatIdrDisplay(registrationFee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cp-muted">Processing fee</dt>
                <dd>{formatIdrDisplay(processingFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-cp-border pt-2 font-semibold text-foreground">
                <dt>Total</dt>
                <dd>{formatIdrDisplay(total)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-cp-muted">
              Payments are processed securely. TandingBase does not send payment emails — all
              updates appear here and in your notifications.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
              disabled={processing || cancelling}
              onClick={() => void cancelRegistrationHandler()}
            >
              Cancel registration
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
