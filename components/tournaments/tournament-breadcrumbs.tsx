import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { publicSportRoutes } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

type TournamentBreadcrumbsProps = {
  sportSlug: string;
  sportName?: string;
  tournamentName: string;
  extra?: Crumb[];
  className?: string;
  /** Higher contrast for overlays on cover images */
  tone?: "default" | "hero";
};

export function TournamentBreadcrumbs({
  sportSlug,
  sportName,
  tournamentName,
  extra = [],
  className,
  tone = "default",
}: TournamentBreadcrumbsProps) {
  const items: Crumb[] = [
    { label: sportName ?? sportSlug, href: publicSportRoutes.sportHub(sportSlug) },
    { label: "Tournaments", href: publicSportRoutes.tournaments(sportSlug) },
    { label: tournamentName },
    ...extra,
  ];

  const isHero = tone === "hero";

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex flex-wrap items-center gap-1 text-xs",
        isHero
          ? "font-medium text-foreground/90 drop-shadow-sm"
          : "text-cp-muted",
        className,
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? (
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0",
                  isHero ? "text-foreground/50" : "opacity-50",
                )}
              />
            ) : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className={cn(
                  "hover:underline",
                  isHero
                    ? "text-foreground/85 hover:text-foreground"
                    : "hover:text-cp-primary",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast && "font-semibold",
                  isLast || isHero ? "text-foreground" : undefined,
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
