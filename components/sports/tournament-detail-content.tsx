"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, MapPin, Users } from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "players", label: "Players" },
  { id: "matches", label: "Matches" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "groups", label: "Group ranks" },
  { id: "gear", label: "Equipment" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TYPE_LABELS = {
  official: "Official / legal tournament",
  recreational: "Recreational / reclub",
  sparring: "Sparring / free play",
} as const;

type TournamentDetailContentProps = {
  tournament: TournamentDetail;
};

export function TournamentDetailContent({ tournament }: TournamentDetailContentProps) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <FadeInView>
        <Link
          href={publicSportRoutes.tournaments(tournament.sportSlug)}
          className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {tournament.sportName} tournaments
        </Link>

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge className="bg-cp-primary/20 text-cp-primary uppercase">
            {tournament.status}
          </Badge>
          <Badge className="border-cp-border text-cp-muted">
            {TYPE_LABELS[tournament.tournamentType]}
          </Badge>
        </div>

        <h1 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
          {tournament.name}
        </h1>
        {tournament.summary ? (
          <p className="mt-3 text-lg text-cp-muted">{tournament.summary}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-cp-muted">
          {tournament.startsAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: tournament.endsAt ? undefined : "short",
              }).format(new Date(tournament.startsAt))}
              {tournament.endsAt
                ? ` – ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(tournament.endsAt))}`
                : null}
            </span>
          ) : null}
          {tournament.venue ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {tournament.venue}
            </span>
          ) : null}
        </div>
      </FadeInView>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-cp-border pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-cp-primary text-cp-primary"
                : "text-cp-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FadeInView delay={0.05} className="mt-6">
        {tab === "overview" ? (
          <div className="space-y-6">
            {tournament.description ? (
              <section className="rounded-xl border border-cp-border bg-cp-card p-6">
                <h2 className="font-semibold text-foreground">About</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-cp-muted">
                  {tournament.description}
                </p>
              </section>
            ) : null}
            {tournament.rules ? (
              <section className="rounded-xl border border-cp-border bg-cp-card p-6">
                <h2 className="font-semibold text-foreground">Tournament rules</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-cp-muted">
                  {tournament.rules}
                </p>
              </section>
            ) : (
              <EmptyModule
                icon={Users}
                title="Rules & format"
                message="Detailed bracket rules and match format will appear here once configured."
              />
            )}
          </div>
        ) : (
          <EmptyModule
            icon={Users}
            title={TABS.find((t) => t.id === tab)?.label ?? "Coming soon"}
            message="This section is part of the tournament module rollout. Players, matches, leaderboards, group ranks, and equipment will be linked here per tournament."
          />
        )}
      </FadeInView>
    </div>
  );
}

function EmptyModule({
  icon: Icon,
  title,
  message,
}: {
  icon: typeof Users;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-cp-border bg-cp-card/40 px-6 py-16 text-center">
      <Icon className="h-10 w-10 text-cp-muted" />
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-cp-muted">{message}</p>
    </div>
  );
}
