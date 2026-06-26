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
  showText?: boolean;
  /** Use on dark image/hero backgrounds */
  inverted?: boolean;
};

const sizeMap = {
  sm: { img: 36, class: "h-8 w-8 sm:h-9 sm:w-9", text: "text-sm sm:text-lg" },
  md: { img: 32, class: "h-8 w-8", text: "text-base" },
  lg: { img: 44, class: "h-11 w-11", text: "text-xl" },
} as const;

export function BrandLogo({
  size = "sm",
  href = "/",
  className,
  showText = true,
  inverted = false,
}: BrandLogoProps) {
  const s = sizeMap[size];

  const content = (
    <>
      <Image
        src={brandAssets.logo}
        alt={siteConfig.name}
        width={s.img}
        height={s.img}
        className={cn("shrink-0", s.class)}
        priority={size !== "sm"}
      />
      {showText ? (
        <BrandWordmark size={size} inverted={inverted} className={s.text} />
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
