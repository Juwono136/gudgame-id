import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Use on dark image/hero backgrounds */
  inverted?: boolean;
};

const sizeMap = {
  sm: "text-sm sm:text-lg",
  md: "text-base",
  lg: "text-xl",
} as const;

export function BrandWordmark({
  className,
  size = "sm",
  inverted = false,
}: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight",
        inverted ? "text-white" : "text-foreground",
        sizeMap[size],
        className,
      )}
    >
      Tanding<span className="text-cp-logo-accent">Base</span>
    </span>
  );
}
