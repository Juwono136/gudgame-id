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
};

export function AuthField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: AuthFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-cp-muted">
        {label}
        {required ? <span className="text-cp-primary"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-[#ff6b6b]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-cp-text-dim">{hint}</p>
      ) : null}
    </div>
  );
}
