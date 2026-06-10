"use client";

import { Banknote, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useHostPayoutProfile, useSetupHostPayout } from "@/hooks/use-host-payout";
import { cn } from "@/lib/utils";

export function HostPayoutSetupCard({ className }: { className?: string }) {
  const { data, isLoading, isError } = useHostPayoutProfile();
  const setup = useSetupHostPayout();

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-cp-border bg-cp-elevated/40 p-4", className)}>
        <LoadingSpinner label="Checking payout setup…" />
      </div>
    );
  }

  if (isError || !data?.xenPlatformEnabled) {
    return null;
  }

  const isActive = data.configured && data.status === "active";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isActive ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {isActive ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">XenPlatform payouts</h2>
          <p className="mt-1 text-xs leading-relaxed text-cp-muted">
            {isActive
              ? `Registration fees for your official tournaments are split automatically. Business: ${data.businessName ?? "Host account"}.`
              : "Before accepting paid registrations, connect your XenPlatform sub-account so host payouts settle directly to you."}
          </p>
          {!isActive ? (
            <Button
              size="sm"
              className="mt-3 bg-amber-600 hover:bg-amber-500"
              disabled={setup.isPending}
              onClick={() => setup.mutate()}
            >
              {setup.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up…
                </>
              ) : (
                "Enable payout account"
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
