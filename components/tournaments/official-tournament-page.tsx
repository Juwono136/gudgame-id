"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, CreditCard, Loader2, MapPin, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { FadeInView } from "@/components/motion/fade-in";
import { OfficialBracketLive } from "@/components/tournaments/official-bracket-live";
import { TournamentParticipantsPanel } from "@/components/tournaments/tournament-participants-panel";
import { TournamentRecentMatchesSection } from "@/components/tournaments/tournament-recent-matches-section";
import { TournamentSessionStatsPanel } from "@/components/tournaments/tournament-session-stats-panel";
import { OfficialRegistrationEditDialog } from "@/components/tournaments/official-registration-edit-dialog";
import { OfficialRegistrationManageActions } from "@/components/tournaments/official-registration-manage-actions";
import { TournamentCountdown } from "@/components/tournaments/tournament-countdown";
import { TournamentOrganizer } from "@/components/tournaments/tournament-organizer";
import { TournamentRulesAccordion } from "@/components/tournaments/tournament-rules-accordion";
import { TournamentShareCard } from "@/components/tournaments/tournament-share-card";
import {
  TournamentDetailPageShell,
  TournamentHeroBanner,
  TournamentTabNav,
  tournamentHeroStyles,
} from "@/components/tournaments/tournament-detail-ui";
import { VenueMapsPreview } from "@/components/tournaments/venue-maps-preview";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useRegistrationStatus } from "@/hooks/use-registration-status";
import { useTournamentBracket } from "@/hooks/use-tournament-bracket";
import { useTournamentParticipants } from "@/hooks/use-tournament-participants";
import { authRoutes, dashboardRoutes, publicSportRoutes } from "@/lib/constants/routes";
import type { TournamentGearRuleItem } from "@/lib/tournaments/gear-for-rules";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import type { TournamentRuleSections } from "@/lib/tournaments/settings";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { mapBracketMatchesToRecentRows } from "@/lib/tournaments/recent-matches";
import { computeOfficialTournamentStats } from "@/lib/tournaments/stats/from-bracket";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { isActiveRegistrationStatus } from "@/lib/tournaments/registration/urls";

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
  participant: TournamentParticipantContext;
  canManage?: boolean;
  venueMapsUrl?: string | null;
  ruleSections?: TournamentRuleSections;
  gearItems?: TournamentGearRuleItem[];
};

const TABS = ["Overview", "Players", "Bracket", "Stats"] as const;

export function OfficialTournamentPage({
  tournament,
  summary,
  isAuthenticated,
  participant,
  canManage = false,
  venueMapsUrl = null,
  ruleSections,
  gearItems = [],
}: OfficialTournamentPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const registerHref = `${publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}/register`;
  const tournamentPublicHref = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
  const [publicUrl, setPublicUrl] = useState("");
  const [resumingPayment, setResumingPayment] = useState(false);
  const [editRegistrationOpen, setEditRegistrationOpen] = useState(false);
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
  const { data: participantsData, isLoading: participantsLoading } = useTournamentParticipants(
    tournament.sportSlug,
    tournament.slug,
    1,
    200,
    { enabled: tab === "Stats" },
  );

  const sessionStats = useMemo(
    () =>
      computeOfficialTournamentStats({
        matches: bracket?.matches ?? [],
        leaderboard: bracket?.leaderboard ?? [],
        participants: participantsData?.items ?? [],
        totalPlayers: summary.registeredPlayers,
        totalTeams: summary.registeredTeams,
      }),
    [
      bracket?.matches,
      bracket?.leaderboard,
      participantsData?.items,
      summary.registeredPlayers,
      summary.registeredTeams,
    ],
  );

  const recentMatchRows = useMemo(
    () => mapBracketMatchesToRecentRows(bracket?.matches ?? []),
    [bracket?.matches],
  );

  const handleRegister = async () => {
    if (!isAuthenticated) {
      router.push(
        `${authRoutes.register}?callbackUrl=${encodeURIComponent(tournamentPublicHref)}`,
      );
      return;
    }
    if (regStatus?.status === "awaiting_confirmation" && regStatus.confirmUrl) {
      router.push(regStatus.confirmUrl);
      return;
    }
    if (regStatus?.status === "pending_payment") {
      if (regStatus.checkoutUrl) {
        router.push(regStatus.checkoutUrl);
        return;
      }

      setResumingPayment(true);
      try {
        const res = await fetch(
          `/api/tournaments/${tournament.sportSlug}/${tournament.slug}/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              teamName: regStatus.teamName?.trim() || "Team",
              memberUserIds: [],
            }),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message ?? "Could not resume payment");
        }
        const checkoutUrl = json.data?.checkoutUrl as string | undefined;
        if (checkoutUrl) {
          router.push(checkoutUrl);
          return;
        }
        toast.error("Checkout is not available. Try again in a moment.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not resume payment");
      } finally {
        setResumingPayment(false);
      }
      return;
    }
    router.push(registerHref);
  };

  return (
    <TournamentDetailPageShell>
      <TournamentHeroBanner coverImageUrl={tournament.coverImageUrl} variant="official">
        <Link
          href={publicSportRoutes.tournaments(tournament.sportSlug)}
          className={tournamentHeroStyles.backLink}
        >
          <ChevronLeft className="mr-1 h-4 w-4 shrink-0" />
          {tournament.sportName} tournaments
        </Link>

        <FadeInView className="mt-5 flex flex-col gap-6 sm:mt-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              {tournament.categoryLabel ? (
                <Badge className="border-0 bg-emerald-500/20 text-emerald-300">
                  {tournament.categoryLabel}
                </Badge>
              ) : null}
              <Badge className={tournamentHeroStyles.statusBadge}>{tournament.status}</Badge>
              <Badge className="border-0 bg-cp-primary/20 text-cp-primary">Official — paid</Badge>
            </div>
            <h1 className={tournamentHeroStyles.title}>{tournament.name}</h1>
            {tournament.creatorName ? (
              <div className="mt-3 sm:mt-4">
                <TournamentOrganizer
                  name={tournament.creatorName}
                  imageUrl={tournament.creatorImage}
                />
              </div>
            ) : null}
            {tournament.summary ? (
              <div className={tournamentHeroStyles.summaryWrap}>
                <RichHtmlContent html={tournament.summary} variant="hero" />
              </div>
            ) : null}
            <div className={tournamentHeroStyles.metaRow}>
              <span className={tournamentHeroStyles.metaItem}>
                <Calendar className="h-4 w-4 shrink-0 text-cp-primary" />
                {formatDateRange(tournament.startsAt, tournament.endsAt)}
              </span>
              {tournament.venue ? (
                <span className={tournamentHeroStyles.metaItem}>
                  <MapPin className="h-4 w-4 shrink-0 text-cp-primary" />
                  <span className="break-words">{tournament.venue}</span>
                </span>
              ) : null}
            </div>
          </div>
          {summary.registrationClosesAt ? (
            <div className="w-full shrink-0 lg:w-auto">
              <TournamentCountdown
                targetDate={summary.registrationClosesAt}
                label="Registration closes in"
                tone="hero"
              />
            </div>
          ) : null}
        </FadeInView>
      </TournamentHeroBanner>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:gap-8 lg:px-8">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <TournamentTabNav tabs={TABS} active={tab} onChange={setTab} variant="official" />

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
              <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-foreground">Who&apos;s playing</h2>
                    <p className="mt-1 text-sm text-cp-muted">
                      {summary.registeredPlayers} players registered
                      {summary.spotsRemaining != null
                        ? ` · ${summary.spotsRemaining} team spots left`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-cp-primary">
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-cp-border"
                  onClick={() => setTab("Players")}
                >
                  View full player list
                </Button>
              </section>
              <TournamentRecentMatchesSection
                variant="official"
                rows={recentMatchRows}
                alwaysShow
                emptyMessage={
                  bracket?.generated
                    ? "No match results yet. Seeded bracket matches will appear here as play progresses."
                    : "The host will publish the bracket after registration closes. Results will show here once matches are played."
                }
                onViewAll={() => setTab("Bracket")}
              />
              {tournament.description ? (
                <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
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

          {tab === "Players" ? (
            <TournamentParticipantsPanel
              sportSlug={tournament.sportSlug}
              slug={tournament.slug}
              tournamentType="official"
              variant="official"
            />
          ) : null}

          {tab === "Bracket" ? (
            bracketLoading ? (
              <LoadingSpinner label="Loading bracket…" />
            ) : (
              <OfficialBracketLive
                sportSlug={tournament.sportSlug}
                slug={tournament.slug}
                matches={bracket?.matches ?? []}
                participant={participant}
              />
            )
          ) : null}

          {tab === "Stats" ? (
            bracketLoading || participantsLoading ? (
              <LoadingSpinner label="Loading stats…" />
            ) : (
              <TournamentSessionStatsPanel
                variant="official"
                stats={sessionStats}
                emptyMessage={
                  bracket?.generated
                    ? undefined
                    : "The host will publish the bracket after registration closes. Stats will appear once matches are played."
                }
              />
            )
          ) : null}
        </div>

        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-cp-primary/30 bg-cp-card p-4 shadow-[0_8px_32px_rgba(0,71,255,0.12)] sm:p-6">
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
            ) : regStatus?.status === "awaiting_confirmation" ? (
              <Badge className="mt-4 border-0 bg-blue-500/20 text-blue-300">
                Confirm participation
              </Badge>
            ) : regStatus?.status === "pending_payment" ? (
              <Badge className="mt-4 border-0 bg-amber-500/20 text-amber-300">
                Payment pending
              </Badge>
            ) : null}

            <Button
              className="btn-interactive mt-6 h-12 w-full bg-cp-primary text-base font-semibold hover:bg-cp-primary-light"
              disabled={
                resumingPayment ||
                (!summary.registrationOpen &&
                  regStatus?.status !== "pending_payment" &&
                  regStatus?.status !== "awaiting_confirmation")
              }
              onClick={() => void handleRegister()}
            >
              {resumingPayment ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              {!isAuthenticated
                ? "Sign up to register"
                : resumingPayment
                  ? "Opening checkout…"
                  : regStatus?.status === "confirmed"
                    ? "Registered"
                    : regStatus?.status === "awaiting_confirmation"
                      ? "Confirm participation"
                      : regStatus?.status === "pending_payment"
                        ? "Continue to checkout"
                        : "Register team"}
            </Button>

            {isAuthenticated &&
            regStatus?.registrationId &&
            regStatus.status &&
            isActiveRegistrationStatus(regStatus.status) ? (
              <OfficialRegistrationManageActions
                registrationId={regStatus.registrationId}
                sportSlug={tournament.sportSlug}
                slug={tournament.slug}
                teamName={regStatus.teamName}
                registrationStatus={regStatus.status}
                layout="stacked"
                onEditTeam={() => setEditRegistrationOpen(true)}
                onCancelled={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["tournaments", "registration-status", tournament.sportSlug, tournament.slug],
                  });
                }}
                redirectOnCancel={publicSportRoutes.tournament(tournament.sportSlug, tournament.slug)}
              />
            ) : null}

            {canManage ? (
              <Button asChild variant="outline" className="mt-3 w-full border-cp-border">
                <Link href={dashboardRoutes.hostTournament(tournament.id)}>
                  Manage registrations
                </Link>
              </Button>
            ) : null}
          </div>

          {editRegistrationOpen && regStatus?.registrationId ? (
            <OfficialRegistrationEditDialog
              open={editRegistrationOpen}
              onOpenChange={setEditRegistrationOpen}
              registrationId={regStatus.registrationId}
              sportSlug={tournament.sportSlug}
              tournamentSlug={tournament.slug}
              tournamentName={tournament.name}
              onSaved={() => {
                void queryClient.invalidateQueries({
                  queryKey: ["tournaments", "registration-status", tournament.sportSlug, tournament.slug],
                });
              }}
            />
          ) : null}

          <TournamentShareCard url={publicUrl} tournamentName={tournament.name} />

        </aside>
      </div>
    </TournamentDetailPageShell>
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
    <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-cp-primary">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <p className={cn("mt-3 text-xl font-bold text-foreground capitalize")}>{value}</p>
      <p className="mt-1 text-xs text-cp-muted">{hint}</p>
    </div>
  );
}
