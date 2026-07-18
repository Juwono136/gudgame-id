"use client";

import { Label } from "@/components/ui/label";
import { FieldError, RequiredMark } from "@/components/tournaments/form/field-required";
import { cn } from "@/lib/utils";

type BillingTypeSelectProps = {
  value: "paid" | "free" | "";
  onChange: (value: "paid" | "free") => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  error?: string | null;
};

export function BillingTypeSelect({
  value,
  onChange,
  disabled,
  className,
  required = false,
  error,
}: BillingTypeSelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        Registration billing
        {required ? <RequiredMark /> : null}
      </Label>
      <div
        className={cn(
          "grid grid-cols-1 gap-2 sm:grid-cols-2",
          error && "rounded-xl ring-1 ring-red-500/50",
        )}
        role="group"
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "billing-select-error" : undefined}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("paid")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            value === "paid"
              ? "border-cp-primary bg-cp-primary/10"
              : "border-cp-border bg-cp-elevated hover:border-cp-primary/40",
            disabled && "cursor-not-allowed opacity-60",
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
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <p className="text-sm font-semibold text-foreground">Free</p>
          <p className="mt-1 text-xs text-cp-muted">No fee — confirm registration only</p>
        </button>
      </div>
      <FieldError id="billing-select-error" message={error} />
    </div>
  );
}
