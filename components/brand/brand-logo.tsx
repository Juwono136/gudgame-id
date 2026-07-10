import Image from "next/image";
import Link from "next/link";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { brandAssets, siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** sm = navbar, md = auth hero, lg = auth desktop hero */
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  /** Logo image already includes the wordmark — enable only when you need text beside the mark */
  showText?: boolean;
  /** Use on dark image/hero backgrounds */
  inverted?: boolean;
};

const sizeMap = {
  sm: { w: 132, h: 40, class: "h-8 w-auto max-w-[8.5rem] sm:h-9 sm:max-w-[9.5rem]" },
  md: { w: 148, h: 44, class: "h-9 w-auto max-w-[10rem]" },
  lg: { w: 180, h: 52, class: "h-11 w-auto max-w-[12rem]" },
} as const;

export function BrandLogo({
  size = "sm",
  href = "/",
  className,
  showText = false,
  inverted = false,
}: BrandLogoProps) {
  const s = sizeMap[size];

  const content = (
    <>
      <Image
        src={brandAssets.logo}
        alt={siteConfig.name}
        width={s.w}
        height={s.h}
        className={cn("shrink-0 object-contain object-left", s.class)}
        priority={size !== "sm"}
      />
      {showText ? (
        <BrandWordmark size={size} inverted={inverted} className={size === "sm" ? "text-sm sm:text-lg" : undefined} />
      ) : null}
    </>
  );

  const wrapperClass = cn(
    "inline-flex items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-cp-primary/50 sm:gap-2.5",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {content}
      </Link>
    );
  }

  return <span className={wrapperClass}>{content}</span>;
}
