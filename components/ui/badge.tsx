import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-cp-border bg-cp-elevated text-cp-logo-accent",
        player: "border-cp-border bg-cp-elevated/80 text-cp-muted",
        host: "border-cp-primary/30 bg-cp-primary/15 text-cp-logo-accent",
        super_admin: "border-red-500/30 bg-red-500/15 text-red-300",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-200",
        danger: "border-red-500/30 bg-red-500/10 text-red-300",
        muted: "border-cp-border bg-transparent text-cp-muted",
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
