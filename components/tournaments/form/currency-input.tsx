"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function parseIdrDigits(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

export function formatIdrDisplay(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("id-ID").format(amount);
}

type CurrencyInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
};

/** IDR input with Rp. prefix and thousand separators while typing */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "10.000",
  className,
  id,
}: CurrencyInputProps) {
  const display = value ? formatIdrDisplay(Number(value.replace(/\D/g, "") || 0)) : "";

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-cp-muted">
        Rp
      </span>
      <Input
        id={id}
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const n = parseIdrDigits(e.target.value);
          onChange(n != null ? String(n) : "");
        }}
        placeholder={placeholder}
        className={cn("border-cp-border bg-cp-bg-input pl-10", className)}
      />
    </div>
  );
}
