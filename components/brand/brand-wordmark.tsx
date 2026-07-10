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
      <span className={inverted ? "text-[#B7F1C9]" : "text-cp-logo-mint"}>Gud</span>{" "}
      <span className={inverted ? "text-[#00BF8B]" : "text-cp-logo-accent"}>Game</span>
    </span>
  );
}
