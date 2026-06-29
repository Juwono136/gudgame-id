"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentGearRuleItem } from "@/lib/tournaments/gear-for-rules";
import { cn } from "@/lib/utils";

type TournamentGearRuleCardsProps = {
  items: TournamentGearRuleItem[];
  sportSlug: string;
  className?: string;
};

export function TournamentGearRuleCards({
  items,
  sportSlug,
  className,
}: TournamentGearRuleCardsProps) {
  if (!items.length) return null;

  return (
    <ul className={cn("mt-4 flex flex-col gap-2", className)}>
      {items.map((gear) => {
        const href = publicSportRoutes.gearItem(sportSlug, gear.slug);
        return (
          <li key={gear.id}>
            <Link
              href={href}
              className="group flex flex-col gap-3 rounded-xl border border-cp-border bg-cp-card p-3 transition-colors hover:border-cp-primary/35 hover:bg-cp-elevated/30 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
            >
              <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-cp-elevated sm:mx-0 sm:h-16 sm:w-16">
                {gear.primaryImageUrl ? (
                  <Image
                    src={gear.primaryImageUrl}
                    alt=""
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="80px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-cp-muted">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-cp-primary">
                  {gear.displayName}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-cp-muted sm:justify-start">
                  {gear.brand ? <span>{gear.brand}</span> : null}
                  {gear.brand && gear.gearCategoryLabel ? (
                    <span className="text-cp-border">·</span>
                  ) : null}
                  {gear.gearCategoryLabel ? (
                    <span className="text-cp-primary">{gear.gearCategoryLabel}</span>
                  ) : null}
                </div>
                {gear.summary ? (
                  <p className="mt-1 line-clamp-2 text-xs text-cp-muted">{gear.summary}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-cp-border/60 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                {gear.priceDisplay ? (
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {gear.priceDisplay}
                  </p>
                ) : (
                  <span className="text-xs text-cp-muted">View details</span>
                )}
                <ChevronRight className="h-4 w-4 text-cp-muted transition-transform group-hover:translate-x-0.5 group-hover:text-cp-primary" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
