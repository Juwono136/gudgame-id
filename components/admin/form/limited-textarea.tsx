"use client";

import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LimitedTextareaProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  className?: string;
};

export function LimitedTextarea({
  id,
  label,
  value,
  onChange,
  maxLength,
  rows = 4,
  placeholder,
  hint,
  error,
  className,
}: LimitedTextareaProps) {
  const atLimit = value.length >= maxLength;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <FieldCharCounter current={value.length} max={maxLength} />
      </div>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || atLimit || undefined}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        className={cn(
          "flex w-full resize-y rounded-lg border border-cp-border bg-cp-bg-input px-3 py-2.5 text-sm text-foreground",
          "placeholder:text-cp-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary/40",
          (error || atLimit) && "border-amber-500/50 ring-1 ring-amber-500/20",
        )}
      />
      {hint ? <p className="text-xs text-cp-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
