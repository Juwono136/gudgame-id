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
};

export function TournamentBreadcrumbs({
  sportSlug,
  sportName,
  tournamentName,
  extra = [],
  className,
}: TournamentBreadcrumbsProps) {
  const items: Crumb[] = [
    { label: sportName ?? sportSlug, href: publicSportRoutes.sportHub(sportSlug) },
    { label: "Tournaments", href: publicSportRoutes.tournaments(sportSlug) },
    { label: tournamentName },
    ...extra,
  ];

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-1 text-xs text-cp-muted", className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-50" /> : null}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-cp-primary hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-foreground" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
