"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { PaymentReceiptActions } from "@/components/payments/payment-receipt-actions";
import { useCancelRegistration } from "@/hooks/use-cancel-registration";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { publicSportRoutes, dashboardRoutes } from "@/lib/constants/routes";
import { formatIdrDisplay } from "@/lib/format/currency";
import { CHECKOUT_PAYMENT_METHODS } from "@/lib/tournaments/payments/checkout-methods";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateTournamentQueries } from "@/lib/tournaments/query-keys";

type RegistrationCheckoutClientProps = {
  tournament: TournamentDetail;
  registrationId: string;
  /** Override hub URL (partner white-label). Defaults to Gud Game sport route. */
  hubHref?: string;
};

type CheckoutDetail = {
  teamName: string | null;
  status: string;
  amountIdr: number | null;
  platformFeeIdr: number | null;
  processingFeeIdr: number | null;
  registrationFeeIdr: number | null;
  paymentStatus: string | null;
  paymentId: string | null;
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

function CheckoutStatusPanel({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
}: {
  icon: typeof CheckCircle2;
  iconClassName: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl border border-cp-border bg-cp-card",
          iconClassName,
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-cp-muted">{description}</p>
      ) : null}
      {children ? <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">{children}</div> : null}
    </div>
  );
}

function OrderSummaryCard({
  tournamentName,
  teamName,
  registrationFee,
  processingFee,
  total,
  disabled,
  onCancel,
}: {
  tournamentName: string;
  teamName: string | null;
  registrationFee: number;
  processingFee: number;
  total: number;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card">
      <div className="border-b border-cp-border bg-cp-elevated/40 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-cp-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Order summary</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-cp-muted">
          <span className="font-medium text-foreground">{tournamentName}</span>
          {teamName ? (
            <>
              {" "}
              · Team <span className="font-medium text-foreground">{teamName}</span>
            </>
          ) : null}
        </p>
      </div>

      <dl className="space-y-3 px-5 py-4 text-sm sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-cp-muted">Registration fee</dt>
          <dd className="font-medium tabular-nums text-foreground">{formatIdrDisplay(registrationFee)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-cp-muted">Processing fee</dt>
          <dd className="font-medium tabular-nums text-foreground">{formatIdrDisplay(processingFee)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-cp-border pt-3">
          <dt className="font-semibold text-foreground">Total</dt>
          <dd className="text-lg font-bold tabular-nums text-foreground">{formatIdrDisplay(total)}</dd>
        </div>
      </dl>

      <div className="border-t border-cp-border bg-cp-elevated/20 px-5 py-4 sm:px-6">
        <p className="text-xs leading-relaxed text-cp-muted">
          Payments are processed securely. After payment, your official receipt is emailed and saved in
          your dashboard.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-10 w-full border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          disabled={disabled}
          onClick={onCancel}
        >
          <XCircle className="mr-2 h-4 w-4 shrink-0" />
          Cancel registration
        </Button>
      </div>
    </div>
  );
}

export function RegistrationCheckoutClient({
  tournament,
  registrationId,
  hubHref: hubHrefProp,
}: RegistrationCheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const { cancelRegistration, isPending: cancelling } = useCancelRegistration();
  const failed = searchParams.get("failed") === "1";
  const hubHref =
    hubHrefProp ?? publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
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
          invalidateTournamentQueries(queryClient, tournament.sportSlug, tournament.slug);
          void queryClient.invalidateQueries({
            queryKey: ["tournaments", "registration-status", tournament.sportSlug, tournament.slug],
          });
          toast.success("Payment received!", {
            description: "Your registration is confirmed. Check your email for the official receipt.",
          });
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
  }, [hubHref, loadDetail, queryClient, registrationId, router, tournament.slug, tournament.sportSlug]);

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
  const busy = processing || cancelling;

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
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <LoadingSpinner label="Loading checkout…" />
      </div>
    );
  }

  if (detail?.paymentStatus === "paid" || detail?.status === "confirmed") {
    return (
      <CheckoutStatusPanel
        icon={CheckCircle2}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        title="Payment complete"
        description="Your team is officially registered. View or download your receipt below."
      >
        <PaymentReceiptActions paymentId={detail.paymentId} />
        <Button asChild variant="outline" className="w-full border-cp-border sm:w-auto">
          <Link href={dashboardRoutes.payments}>Payment history</Link>
        </Button>
        <Button asChild className="w-full bg-cp-primary sm:w-auto">
          <Link href={hubHref}>Back to tournament</Link>
        </Button>
      </CheckoutStatusPanel>
    );
  }

  if (registrationCancelled || paymentExpired) {
    return (
      <CheckoutStatusPanel
        icon={AlertCircle}
        iconClassName="text-amber-600 dark:text-amber-400"
        title="Registration cancelled"
        description={`The payment window has closed and your team slot was released.${paymentDeadline ? ` Deadline was ${paymentDeadline}.` : ""}`}
      >
        <Button asChild variant="outline" className="w-full border-cp-border sm:w-auto">
          <Link href={hubHref}>Back to tournament</Link>
        </Button>
        <Button asChild className="w-full bg-cp-primary sm:w-auto">
          <Link href={registerHref}>Register again</Link>
        </Button>
      </CheckoutStatusPanel>
    );
  }

  const summaryCard = (
    <OrderSummaryCard
      tournamentName={tournament.name}
      teamName={detail?.teamName ?? null}
      registrationFee={registrationFee}
      processingFee={processingFee}
      total={total}
      disabled={busy}
      onCancel={() => void cancelRegistrationHandler()}
    />
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <LoadingOverlay show={busy} label="Processing…" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={hubHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-cp-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to tournament
        </Link>
        {paymentDeadline ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cp-border bg-cp-card px-3 py-1.5 text-xs text-cp-muted">
            <Clock className="h-3.5 w-3.5 shrink-0 text-cp-primary" aria-hidden />
            <span>
              Pay by <span className="font-medium text-foreground">{paymentDeadline}</span>
            </span>
          </div>
        ) : null}
      </div>

      {paymentFailed ? (
        <div
          className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 dark:border-amber-500/30"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Previous payment did not complete</p>
            <p className="mt-1 text-xs leading-relaxed text-cp-muted">
              Your team slot is still reserved. Select a payment method below to try again
              {paymentDeadline ? ` before ${paymentDeadline}` : ""}.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-9 border-cp-border bg-cp-card"
              onClick={retryCheckout}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className="lg:hidden">{summaryCard}</div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-cp-border bg-cp-card cp-shadow-card lg:mt-0">
            <div className="border-b border-cp-border bg-cp-elevated/30 px-5 py-5 sm:px-6 sm:py-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-cp-primary">
                Secure checkout · Gud Game
              </p>
              <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {instructions ? "Complete your payment" : "Choose payment method"}
              </h1>
              <p className="mt-2 text-sm text-cp-muted">
                {tournament.name}
                {detail?.teamName ? ` · Team ${detail.teamName}` : null}
              </p>
            </div>

            <div className="p-5 sm:p-6">
              {!instructions ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CHECKOUT_PAYMENT_METHODS.map((m) => {
                    const Icon = METHOD_ICONS[m.id] ?? CreditCard;
                    const active = selectedMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={busy}
                        onClick={() => void initiatePayment(m.id)}
                        className={cn(
                          "group flex min-h-[5.5rem] items-start gap-3 rounded-xl border p-4 text-left transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary/50",
                          active
                            ? "border-cp-primary bg-cp-primary/10 shadow-[0_0_0_1px_rgba(0,191,139,0.25)]"
                            : "border-cp-border bg-cp-elevated/30 hover:border-cp-primary/40 hover:bg-cp-elevated/60",
                          busy && "pointer-events-none opacity-60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cp-border bg-cp-card transition-colors",
                            active
                              ? "border-cp-primary/40 bg-cp-primary/15"
                              : "group-hover:border-cp-primary/30",
                          )}
                        >
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
                      <p className="max-w-sm text-center text-sm leading-relaxed text-cp-muted">
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
                    onClick={retryCheckout}
                  >
                    Change payment method
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-24">{summaryCard}</aside>
      </div>
    </div>
  );
}
