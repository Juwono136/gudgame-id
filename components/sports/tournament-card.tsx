import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  upcoming: "bg-sky-900/40 text-sky-200",
  live: "bg-red-900/50 text-red-200",
  completed: "bg-cp-elevated text-cp-muted",
  cancelled: "bg-cp-elevated text-cp-muted",
  draft: "bg-cp-elevated text-cp-muted",
} as const;

const TYPE_LABELS = {
  official: "Official",
  recreational: "Recreational",
  sparring: "Sparring",
} as const;

function formatDateRange(starts: string | null, ends: string | null) {
  if (!starts) return "Date TBA";
  const start = new Date(starts);
  const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
  if (!ends) return fmt.format(start);
  const end = new Date(ends);
  if (start.toDateString() === end.toDateString()) return fmt.format(start);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

type TournamentCardProps = {
  tournament: TournamentListItem;
  className?: string;
};

export function TournamentCard({ tournament, className }: TournamentCardProps) {
  return (
    <Link
      href={publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}
      className={cn(
        "group block rounded-xl border border-cp-border bg-cp-card p-5 transition-all duration-300",
        "hover:border-cp-primary/40 hover:shadow-[0_8px_32px_rgba(0,71,255,0.12)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={cn(
            "border-0 text-[10px] font-semibold uppercase",
            STATUS_STYLES[tournament.status],
          )}
        >
          {tournament.status}
        </Badge>
        <Badge className="border-cp-border text-[10px] text-cp-muted">
          {TYPE_LABELS[tournament.tournamentType]}
        </Badge>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-foreground transition-colors group-hover:text-cp-primary">
        {tournament.name}
      </h3>
      {tournament.summary ? (
        <p className="mt-1 line-clamp-2 text-sm text-cp-muted">{tournament.summary}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-cp-muted">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDateRange(tournament.startsAt, tournament.endsAt)}
        </span>
        {tournament.venue ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {tournament.venue}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
