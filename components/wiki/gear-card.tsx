import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { WikiImage } from "@/components/wiki/wiki-image";
import { getPublicWikiPath } from "@/lib/wiki/constants";
import type { PublicGearListItem } from "@/lib/wiki/public-gear";
import { cn } from "@/lib/utils";

type GearCardProps = {
  sportSlug: string;
  item: PublicGearListItem;
  priority?: boolean;
  className?: string;
};

export function GearCard({ sportSlug, item, priority = false, className }: GearCardProps) {
  const href = getPublicWikiPath(sportSlug, "gear", item.slug);

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-cp-border bg-cp-card transition-all",
        "hover:border-cp-primary/45 hover:shadow-[0_0_20px_var(--cp-primary-glow)]",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-cp-elevated">
        {item.primaryImageUrl ? (
          <WikiImage
            src={item.primaryImageUrl}
            alt={item.displayName}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-cp-muted">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-cp-logo-accent">
            {item.displayName}
          </h2>
        </div>
        {item.brand ? (
          <p className="mt-0.5 truncate text-xs text-cp-muted">{item.brand}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge className="h-5 border-cp-border bg-cp-elevated px-1.5 text-[10px] font-medium">
            {item.categoryLabel}
          </Badge>
          {item.priceDisplay ? (
            <span className="text-xs font-semibold text-emerald-400">{item.priceDisplay}</span>
          ) : null}
        </div>
        {item.summary ? (
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-cp-text-dim">
            {item.summary}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
