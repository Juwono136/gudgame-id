"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RegistrationActionIconButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "outline" | "ghost" | "danger";
  className?: string;
};

const variantClass: Record<NonNullable<RegistrationActionIconButtonProps["variant"]>, string> = {
  default: "bg-cp-primary text-primary-foreground hover:bg-cp-primary-light",
  outline: "border-cp-border bg-cp-elevated/40 text-foreground hover:border-cp-primary/40 hover:bg-cp-primary/10",
  ghost: "text-cp-muted hover:bg-cp-elevated hover:text-foreground",
  danger: "border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300",
};

export function RegistrationActionIconButton({
  icon: Icon,
  label,
  onClick,
  href,
  disabled,
  loading,
  variant = "outline",
  className,
}: RegistrationActionIconButtonProps) {
  const content = loading ? (
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
  ) : (
    <Icon className="h-4 w-4" aria-hidden />
  );

  const sharedClass = cn(
    "h-9 w-9 shrink-0 rounded-lg",
    variantClass[variant],
    className,
  );

  if (href) {
    return (
      <Button
        asChild
        size="icon"
        variant="outline"
        className={sharedClass}
        title={label}
        aria-label={label}
        disabled={disabled}
      >
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={sharedClass}
      title={label}
      aria-label={label}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {content}
    </Button>
  );
}
