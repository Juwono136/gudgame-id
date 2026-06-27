"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BillingTypeSelectProps = {
  value: "paid" | "free";
  onChange: (value: "paid" | "free") => void;
  disabled?: boolean;
  className?: string;
};

export function BillingTypeSelect({
  value,
  onChange,
  disabled,
  className,
}: BillingTypeSelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>Registration billing</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("paid")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            value === "paid"
              ? "border-cp-primary bg-cp-primary/10"
              : "border-cp-border bg-cp-elevated hover:border-cp-primary/40",
          )}
        >
          <p className="text-sm font-semibold text-foreground">Paid</p>
          <p className="mt-1 text-xs text-cp-muted">Registration fee via payment gateway</p>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("free")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            value === "free"
              ? "border-cp-primary bg-cp-primary/10"
              : "border-cp-border bg-cp-elevated hover:border-cp-primary/40",
          )}
        >
          <p className="text-sm font-semibold text-foreground">Free</p>
          <p className="mt-1 text-xs text-cp-muted">No fee — confirm registration only</p>
        </button>
      </div>
    </div>
  );
}
