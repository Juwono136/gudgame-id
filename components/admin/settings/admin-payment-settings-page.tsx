"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { PaymentTransactionsLedger } from "@/components/payments/payment-transactions-ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  formatIdrInput,
  formatPercentInput,
  parseIdrInput,
  parsePercentInput,
} from "@/lib/format/currency";
import type { AdminSessionContext } from "@/lib/admin/types";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

type PlatformPaymentSettings = {
  platformFeeIdr: number;
  processingFeePercent: number;
};

type AdminPaymentSettingsPageProps = {
  context: AdminSessionContext;
};

const TABS = ["transactions", "settings"] as const;

export function AdminPaymentSettingsPage({ context }: AdminPaymentSettingsPageProps) {
  const { confirm } = useConfirmDialog();
  const [tab, setTab] = useState<(typeof TABS)[number]>("transactions");
  const [settings, setSettings] = useState<PlatformPaymentSettings | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const [percentInput, setPercentInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/platform/payment-settings");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed to load settings");
        const s = json.data.settings as PlatformPaymentSettings;
        setSettings(s);
        setFeeInput(formatIdrInput(s.platformFeeIdr));
        setPercentInput(formatPercentInput(s.processingFeePercent));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    const platformFeeIdr = parseIdrInput(feeInput);
    const processingFeePercent = parsePercentInput(percentInput);

    if (platformFeeIdr == null) {
      toast.error("Invalid platform fee", { description: "Use format like 2.000 or 10000" });
      return;
    }
    if (processingFeePercent == null) {
      toast.error("Invalid processing fee", { description: "Enter a percentage between 0 and 25" });
      return;
    }

    const ok = await confirm({
      title: "Update payment settings?",
      description: `Platform fee: Rp ${formatIdrInput(platformFeeIdr)} per registration. Processing fee: ${processingFeePercent}% added to player total.`,
      confirmLabel: "Save changes",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/platform/payment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformFeeIdr, processingFeePercent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Save failed");
      const s = json.data.settings as PlatformPaymentSettings;
      setSettings(s);
      setFeeInput(formatIdrInput(s.platformFeeIdr));
      setPercentInput(formatPercentInput(s.processingFeePercent));
      toast.success("Payment settings updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell context={context} title="Payment settings">
      <LoadingOverlay show={saving} label="Saving settings…" />

      <div className="space-y-6">
        <p className="max-w-3xl text-sm text-cp-muted">
          Monitor all official tournament transactions, configure platform commission, and track
          host payouts across TandingBase.
        </p>

        <div className="flex gap-1 rounded-lg border border-cp-border p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-cp-primary/15 text-cp-primary"
                  : "text-cp-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "transactions" ? (
          <PaymentTransactionsLedger
            apiPath="/api/admin/payments/transactions"
            scope="admin"
            showHostColumn
            showPlatformFees
          />
        ) : loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading settings…" />
          </div>
        ) : settings ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="max-w-xl space-y-5 rounded-2xl border border-cp-border bg-cp-card p-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Fee configuration</h3>
                <p className="mt-1 text-xs text-cp-muted">
                  Two separate fees apply to every official registration. They serve different
                  purposes — one is platform revenue, the other covers payment gateway costs.
                </p>
              </div>
              <div>
                <Label htmlFor="platformFeeIdr">Platform commission (fixed IDR)</Label>
                <Input
                  id="platformFeeIdr"
                  className="mt-1.5"
                  placeholder="2.000"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  onBlur={() => {
                    const n = parseIdrInput(feeInput);
                    if (n != null) setFeeInput(formatIdrInput(n));
                  }}
                />
                <p className="mt-1 text-xs text-cp-muted">
                  A flat amount in Rupiah deducted from each registration fee before the host
                  receives their payout. Example: Rp 10.000 per team.
                </p>
              </div>
              <div>
                <Label htmlFor="processingFeePercent">Processing fee (percentage)</Label>
                <Input
                  id="processingFeePercent"
                  className="mt-1.5"
                  placeholder="1,25"
                  value={percentInput}
                  onChange={(e) => setPercentInput(e.target.value)}
                  onBlur={() => {
                    const n = parsePercentInput(percentInput);
                    if (n != null) setPercentInput(formatPercentInput(n));
                  }}
                />
                <p className="mt-1 text-xs text-cp-muted">
                  A percentage of the registration fee added on top of what the player pays, to
                  cover Xendit gateway costs. Example: 1,25% of Rp 100.000 = Rp 1.250 extra.
                </p>
              </div>
              <Button onClick={() => void save()} disabled={saving} className="bg-cp-primary">
                Save settings
              </Button>
            </div>

            <div className="rounded-2xl border border-cp-primary/20 bg-cp-primary/5 p-6">
              <h3 className="text-sm font-semibold text-foreground">How fees split (example)</h3>
              <p className="mt-1 text-xs text-cp-muted">
                Registration fee Rp 100.000 with platform commission Rp{" "}
                {formatIdrInput(settings.platformFeeIdr)} and processing{" "}
                {formatPercentInput(settings.processingFeePercent)}%:
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-cp-muted">Player pays (total)</dt>
                  <dd className="font-medium text-foreground">
                    Rp{" "}
                    {formatIdrInput(
                      100_000 +
                        Math.round((100_000 * settings.processingFeePercent) / 100),
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-cp-muted">Registration fee</dt>
                  <dd>Rp 100.000</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-cp-muted">+ Processing fee (player)</dt>
                  <dd>
                    Rp {formatIdrInput(Math.round((100_000 * settings.processingFeePercent) / 100))}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-cp-border/60 pt-2">
                  <dt className="text-cp-muted">− Platform commission</dt>
                  <dd className="text-amber-300">
                    Rp {formatIdrInput(settings.platformFeeIdr)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 font-semibold text-emerald-300">
                  <dt>Host receives</dt>
                  <dd>Rp {formatIdrInput(Math.max(0, 100_000 - settings.platformFeeIdr))}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-cp-muted">
                <strong className="font-medium text-foreground">Why both?</strong> The fixed IDR
                commission is TandingBase platform revenue. The percentage is passed through to
                cover variable payment-gateway fees (QRIS, VA, e-wallet) that scale with transaction
                size — so the host is not charged for gateway costs.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
