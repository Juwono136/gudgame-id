"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { clampInt } from "@/lib/tournaments/form/bounded-number";
import { cn } from "@/lib/utils";

type BoundedNumberInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange" | "min" | "max"
> & {
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
};

export { clampInt } from "@/lib/tournaments/form/bounded-number";

/**
 * Numeric field that allows intermediate edits (clear / multi-digit typing).
 * Clamping happens on blur — avoids the classic bug where typing "2" after "1"
 * becomes "12" and snaps to max (e.g. meetings → 10, legs → 9).
 */
export function BoundedNumberInput({
  value,
  min,
  max,
  onValueChange,
  className,
  onBlur,
  onFocus,
  onKeyDown,
  ...props
}: BoundedNumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = raw.trim() === "" ? Number.NaN : Number(raw);
    const next = clampInt(parsed, min, max);
    onValueChange(next);
    setDraft(String(next));
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      className={cn(className)}
      value={focused ? draft : String(value)}
      onFocus={(e) => {
        setFocused(true);
        setDraft(String(value));
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^\d+$/.test(raw)) return;
        setDraft(raw);
      }}
      onBlur={(e) => {
        setFocused(false);
        commit(draft);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
}
