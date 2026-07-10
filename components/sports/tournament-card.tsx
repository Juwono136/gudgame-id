import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TournamentCountdown } from "@/components/tournaments/tournament-countdown";
import { publicSportRoutes } from "@/lib/constants/routes";
import { htmlExcerpt } from "@/lib/html/strip-html";
import type { TournamentListItem } from "@/lib/tournaments/service";
import { getPublicTournamentTypeLabel } from "@/lib/tournaments/constants";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  upcoming: "bg-sky-900/40 text-sky-200",
  live: "bg-red-900/50 text-red-200",
  completed: "bg-cp-elevated text-cp-muted",
  cancelled: "bg-cp-elevated text-cp-muted",
  draft: "bg-cp-elevated text-cp-muted",
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

function formatIdr(amount: number | null | undefined) {
  if (amount == null) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type TournamentCardProps = {
  tournament: TournamentListItem & { coverImageUrl?: string | null; prizePoolIdr?: number | null };
  registrationClosesAt?: string | null;
  className?: string;
};

export function TournamentCard({ tournament, registrationClosesAt, className }: TournamentCardProps) {
  const fee = formatIdr(tournament.registrationFeeIdr);
  const prize = formatIdr(tournament.prizePoolIdr);

  return (
    <Link
      href={publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}
      className={cn(
        "group block overflow-hidden rounded-xl border border-cp-border bg-cp-card transition-all duration-300",
        "hover:border-cp-primary/40 hover:shadow-[0_8px_32px_rgba(0,191,139,0.12)]",
        className,
      )}
    >
      {tournament.coverImageUrl ? (
        <div className="relative h-32 w-full bg-cp-elevated">
          <Image
            src={tournament.coverImageUrl}
            alt=""
            fill
            className="object-cover opacity-80 transition-opacity group-hover:opacity-100"
            unoptimized
          />
        </div>
      ) : null}
      <div className="p-5">
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
            {getPublicTournamentTypeLabel(tournament.tournamentType)}
          </Badge>
          {fee ? (
            <Badge className="border-0 bg-cp-primary/15 text-[10px] text-cp-primary">{fee}</Badge>
          ) : null}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-foreground transition-colors group-hover:text-cp-primary">
          {tournament.name}
        </h3>
        {tournament.summary ? (
          <p className="mt-1 line-clamp-2 text-sm text-cp-muted">
            {htmlExcerpt(tournament.summary, 120)}
          </p>
        ) : null}
        {prize ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400/90">
            <Trophy className="h-3.5 w-3.5" />
            Prize {prize}
          </p>
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
        {registrationClosesAt && tournament.status === "upcoming" ? (
          <div className="mt-3">
            <TournamentCountdown
              targetDate={registrationClosesAt}
              label="Closes in"
              className="scale-75 origin-left"
            />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
