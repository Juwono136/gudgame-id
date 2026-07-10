"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
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
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type PlatformPaymentSettings = {
  platformFeeIdr: number;
  processingFeePercent: number;
};

export function AdminPaymentFeeSettingsCard() {
  const { confirm } = useConfirmDialog();
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading fee configuration…" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-dashed border-cp-border px-6 py-14 text-center text-sm text-cp-muted">
        Could not load fee configuration.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LoadingOverlay show={saving} label="Saving settings…" />

      <div className="flex items-start gap-3 rounded-2xl border border-cp-primary/20 bg-cp-primary/5 px-4 py-3 sm:px-5">
        <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
        <p className="text-xs leading-relaxed text-cp-muted sm:text-sm">
          <strong className="font-medium text-foreground">Platform owner only.</strong> These fees
          apply to every official (paid) tournament registration across Gud Game. Hosts cannot
          change them — they only receive payouts after your commission is deducted.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Fee configuration</h3>
            <p className="mt-1 text-xs text-cp-muted">
              Two separate fees apply to every official registration. One is platform revenue, the
              other covers payment gateway costs.
            </p>
          </div>
          <div>
            <Label htmlFor="platformFeeIdr">Platform commission (fixed IDR)</Label>
            <Input
              id="platformFeeIdr"
              className="mt-1.5 border-cp-border bg-cp-elevated/50"
              placeholder="2.000"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              onBlur={() => {
                const n = parseIdrInput(feeInput);
                if (n != null) setFeeInput(formatIdrInput(n));
              }}
            />
            <p className="mt-1 text-xs text-cp-muted">
              Flat amount deducted from each registration fee before the host receives their payout.
            </p>
          </div>
          <div>
            <Label htmlFor="processingFeePercent">Processing fee (percentage)</Label>
            <Input
              id="processingFeePercent"
              className="mt-1.5 border-cp-border bg-cp-elevated/50"
              placeholder="1,25"
              value={percentInput}
              onChange={(e) => setPercentInput(e.target.value)}
              onBlur={() => {
                const n = parsePercentInput(percentInput);
                if (n != null) setPercentInput(formatPercentInput(n));
              }}
            />
            <p className="mt-1 text-xs text-cp-muted">
              Percentage added on top of what the player pays to cover Xendit gateway costs.
            </p>
          </div>
          <Button onClick={() => void save()} disabled={saving} className="bg-cp-primary">
            Save settings
          </Button>
        </div>

        <div className="rounded-2xl border border-cp-primary/20 bg-cp-primary/5 p-4 sm:p-6">
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
                  100_000 + Math.round((100_000 * settings.processingFeePercent) / 100),
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
              <dd className="text-amber-300">Rp {formatIdrInput(settings.platformFeeIdr)}</dd>
            </div>
            <div className="flex justify-between gap-4 font-semibold text-emerald-300">
              <dt>Host receives</dt>
              <dd>Rp {formatIdrInput(Math.max(0, 100_000 - settings.platformFeeIdr))}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-cp-muted">
            The fixed IDR commission is Gud Game platform revenue. The percentage is passed
            through to cover variable payment-gateway fees so hosts are not charged for gateway
            costs.
          </p>
        </div>
      </div>
    </div>
  );
}
