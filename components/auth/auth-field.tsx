"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Hide hint/error (e.g. when a parent group renders a shared message) */
  suppressFooter?: boolean;
  /** Keeps consistent vertical rhythm when hint/error is absent */
  reserveFooterSpace?: boolean;
};

export function AuthField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
  suppressFooter = false,
  reserveFooterSpace = false,
}: AuthFieldProps) {
  const showFooter = !suppressFooter && (error || hint || reserveFooterSpace);

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-cp-muted">
        {label}
        {required ? <span className="text-cp-primary"> *</span> : null}
      </Label>
      {children}
      {showFooter ? (
        <div
          className={cn(
            "min-h-5 text-xs leading-relaxed",
            error ? "text-destructive" : "text-cp-text-dim",
          )}
          role={error ? "alert" : undefined}
        >
          {error ?? hint ?? "\u00A0"}
        </div>
      ) : null}
    </div>
  );
}
