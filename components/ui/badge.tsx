import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "border-cp-border bg-cp-elevated text-cp-logo-accent dark:text-cp-logo-accent",
        player: cn(
          "border-slate-600/20 bg-slate-500/10 text-slate-700",
          "dark:border-cp-border dark:bg-cp-elevated/80 dark:text-cp-muted",
        ),
        host: cn(
          "border-cp-primary/25 bg-cp-primary/10 text-cp-primary",
          "dark:border-cp-primary/30 dark:bg-cp-primary/15 dark:text-cp-logo-accent",
        ),
        accent: cn(
          "border-cp-primary/25 bg-cp-primary/10 text-cp-primary",
          "dark:border-cp-primary/30 dark:bg-cp-primary/15 dark:text-cp-logo-accent",
        ),
        super_admin: cn(
          "border-red-600/25 bg-red-500/10 text-red-800",
          "dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300",
        ),
        success: cn(
          "border-emerald-600/25 bg-emerald-500/12 text-emerald-800",
          "dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
        ),
        warning: cn(
          "border-amber-600/25 bg-amber-500/12 text-amber-900",
          "dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200",
        ),
        danger: cn(
          "border-red-600/25 bg-red-500/10 text-red-800",
          "dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
        ),
        muted: "border-cp-border bg-cp-elevated text-cp-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
