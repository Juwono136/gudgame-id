"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, CreditCard, MapPin, Trophy, Users } from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { OfficialBracketLive } from "@/components/tournaments/official-bracket-live";
import { OfficialLeaderboard } from "@/components/tournaments/official-leaderboard";
import { TournamentCountdown } from "@/components/tournaments/tournament-countdown";
import { TournamentOrganizer } from "@/components/tournaments/tournament-organizer";
import { TournamentRulesAccordion } from "@/components/tournaments/tournament-rules-accordion";
import { TournamentShareCard } from "@/components/tournaments/tournament-share-card";
import { VenueMapsPreview } from "@/components/tournaments/venue-maps-preview";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useRegistrationStatus } from "@/hooks/use-registration-status";
import { useTournamentBracket } from "@/hooks/use-tournament-bracket";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentGearRuleItem } from "@/lib/tournaments/gear-for-rules";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { TournamentRuleSections } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { cn } from "@/lib/utils";

function formatIdr(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateRange(starts: string | null, ends: string | null) {
  if (!starts) return "Date TBA";
  const start = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(starts));
  if (!ends) return start;
  const end = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(ends));
  return `${start} – ${end}`;
}

type OfficialTournamentPageProps = {
  tournament: TournamentDetail;
  summary: TournamentRegistrationSummary;
  isAuthenticated: boolean;
  canManage?: boolean;
  venueMapsUrl?: string | null;
  ruleSections?: TournamentRuleSections;
  gearItems?: TournamentGearRuleItem[];
};

const TABS = ["Overview", "Bracket", "Leaderboard"] as const;

export function OfficialTournamentPage({
  tournament,
  summary,
  isAuthenticated,
  canManage = false,
  venueMapsUrl = null,
  ruleSections,
  gearItems = [],
}: OfficialTournamentPageProps) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const registerHref = `${publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}/register`;
  const [publicUrl, setPublicUrl] = useState("");
  useEffect(() => {
    setPublicUrl(window.location.href);
  }, []);

  const { data: regStatus } = useRegistrationStatus(
    tournament.sportSlug,
    tournament.slug,
    isAuthenticated,
  );
  const { data: bracket, isLoading: bracketLoading } = useTournamentBracket(
    tournament.sportSlug,
    tournament.slug,
  );

  const handleRegister = () => {
    if (!isAuthenticated) {
      router.push(`${authRoutes.register}?callbackUrl=${encodeURIComponent(registerHref)}`);
      return;
    }
    if (regStatus?.status === "pending_payment" && regStatus.invoiceUrl) {
      window.location.href = regStatus.invoiceUrl;
      return;
    }
    router.push(registerHref);
  };

  return (
    <div className="min-h-screen bg-cp-bg">
      <div className="relative overflow-hidden border-b border-cp-border">
        {tournament.coverImageUrl ? (
          <div className="absolute inset-0">
            <Image
              src={tournament.coverImageUrl}
              alt=""
              fill
              className="object-cover opacity-30"
              unoptimized
            />
            <div className="absolute inset-0 bg-linear-to-b from-cp-bg/40 via-cp-bg/80 to-cp-bg" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-linear-to-b from-cp-primary/20 via-cp-card/80 to-cp-bg" />
        )}

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href={publicSportRoutes.tournaments(tournament.sportSlug)}
            className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {tournament.sportName} tournaments
          </Link>

          <FadeInView className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                {tournament.categoryLabel ? (
                  <Badge className="border-0 bg-emerald-500/20 text-emerald-300">
                    {tournament.categoryLabel}
                  </Badge>
                ) : null}
                <Badge className="border-cp-border bg-cp-elevated uppercase text-cp-muted">
                  {tournament.status}
                </Badge>
                <Badge className="border-0 bg-cp-primary/20 text-cp-primary">Official — paid</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {tournament.name}
              </h1>
              {tournament.creatorName ? (
                <div className="mt-4">
                  <TournamentOrganizer
                    name={tournament.creatorName}
                    imageUrl={tournament.creatorImage}
                  />
                </div>
              ) : null}
              {tournament.summary ? (
                <div className="mt-3 max-w-2xl text-lg text-cp-muted">
                  <RichHtmlContent html={tournament.summary} />
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-4 text-sm text-cp-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDateRange(tournament.startsAt, tournament.endsAt)}
                </span>
                {tournament.venue ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {tournament.venue}
                  </span>
                ) : null}
              </div>
            </div>
            {summary.registrationClosesAt ? (
              <TournamentCountdown
                targetDate={summary.registrationClosesAt}
                label="Registration closes in"
              />
            ) : null}
          </FadeInView>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-cp-border pb-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  tab === t
                    ? "bg-cp-primary/15 text-cp-primary"
                    : "text-cp-muted hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Overview" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={Trophy}
                  title="Prize pool"
                  value={formatIdr(tournament.prizePoolIdr)}
                  hint="Distributed among top placements."
                />
                <InfoCard
                  icon={Users}
                  title="Format"
                  value={tournament.format.replace(/_/g, " ")}
                  hint={
                    tournament.maxTeams
                      ? `Up to ${tournament.maxTeams} teams · ${tournament.playersPerTeam} players/team`
                      : `${tournament.playersPerTeam} players per team`
                  }
                />
              </div>
              <section className="rounded-2xl border border-cp-border bg-cp-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-foreground">Who&apos;s playing</h2>
                  <span className="text-sm text-cp-muted">
                    {summary.registeredTeams}
                    {summary.maxTeams != null ? ` / ${summary.maxTeams}` : ""} teams
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-cp-elevated">
                  <div
                    className="h-full rounded-full bg-cp-primary transition-all duration-500"
                    style={{
                      width: `${summary.maxTeams ? Math.min(100, (summary.registeredTeams / summary.maxTeams) * 100) : 40}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-sm text-cp-muted">
                  {summary.registeredPlayers} players registered
                  {summary.spotsRemaining != null
                    ? ` · ${summary.spotsRemaining} team spots left`
                    : ""}
                </p>
              </section>
              {tournament.description ? (
                <section className="rounded-2xl border border-cp-border bg-cp-card p-6">
                  <h2 className="font-semibold text-foreground">About</h2>
                  <div className="mt-3 text-sm leading-relaxed text-cp-muted">
                    <RichHtmlContent html={tournament.description} variant="article" />
                  </div>
                </section>
              ) : null}
              {tournament.venue ? (
                <VenueMapsPreview
                  venue={tournament.venue}
                  mapsUrl={venueMapsUrl}
                />
              ) : null}
              <TournamentRulesAccordion
                eligibilityHtml={ruleSections?.eligibilityHtml}
                matchFormatHtml={ruleSections?.matchFormatHtml}
                equipmentStandardsHtml={ruleSections?.equipmentStandardsHtml}
                format={tournament.format}
                categoryLabel={tournament.categoryLabel}
                sportName={tournament.sportName}
                sportSlug={tournament.sportSlug}
                gearItems={gearItems}
              />
            </>
          ) : null}

          {tab === "Bracket" ? (
            bracketLoading ? (
              <LoadingSpinner label="Loading bracket…" />
            ) : (
              <OfficialBracketLive
                sportSlug={tournament.sportSlug}
                slug={tournament.slug}
                matches={bracket?.matches ?? []}
                canManage={canManage}
              />
            )
          ) : null}

          {tab === "Leaderboard" ? (
            bracketLoading ? (
              <LoadingSpinner label="Loading standings…" />
            ) : (
              <OfficialLeaderboard entries={bracket?.leaderboard ?? []} />
            )
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-cp-primary/30 bg-cp-card p-6 shadow-[0_8px_32px_rgba(0,71,255,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
              Registration fee
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {formatIdr(tournament.registrationFeeIdr)}
              <span className="ml-1 text-base font-medium text-cp-muted">/ team</span>
            </p>

            {summary.registrationClosesAt ? (
              <div className="mt-4">
                <TournamentCountdown
                  targetDate={summary.registrationClosesAt}
                  label="Closes in"
                  className="scale-90 origin-left"
                />
              </div>
            ) : null}

            {summary.spotsRemaining != null ? (
              <p className="mt-2 text-xs text-cp-muted">{summary.spotsRemaining} spots remaining</p>
            ) : null}

            {regStatus?.status === "confirmed" ? (
              <Badge className="mt-4 border-0 bg-emerald-500/20 text-emerald-300">
                You&apos;re registered
                {regStatus.teamName ? ` · ${regStatus.teamName}` : ""}
              </Badge>
            ) : regStatus?.status === "pending_payment" ? (
              <Badge className="mt-4 border-0 bg-amber-500/20 text-amber-300">
                Payment pending
              </Badge>
            ) : null}

            <Button
              className="btn-interactive mt-6 h-12 w-full bg-cp-primary text-base font-semibold hover:bg-cp-primary-light"
              disabled={!summary.registrationOpen && regStatus?.status !== "pending_payment"}
              onClick={handleRegister}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {!isAuthenticated
                ? "Sign up to register"
                : regStatus?.status === "confirmed"
                  ? "Registered"
                  : regStatus?.status === "pending_payment"
                    ? "Continue payment"
                    : "Pay & register"}
            </Button>

          
          </div>

          <TournamentShareCard url={publicUrl} tournamentName={tournament.name} />

        </aside>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: typeof Trophy;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-cp-border bg-cp-card p-5">
      <div className="flex items-center gap-2 text-cp-primary">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <p className={cn("mt-3 text-xl font-bold text-foreground capitalize")}>{value}</p>
      <p className="mt-1 text-xs text-cp-muted">{hint}</p>
    </div>
  );
}
