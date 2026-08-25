"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LayoutGrid,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Swords,
  Trophy,
  UserRound,
  UserPlus,
  Users,
} from "lucide-react";
import { FadeInView } from "@/components/motion/fade-in";
import { FunMatchScoringWorkspace } from "@/components/tournaments/manage/fun-match-scoring-workspace";
import { DoubleStageBracketAwaitingPanel } from "@/components/tournaments/manage/double-stage-bracket-awaiting-panel";
import { DoubleStageManagePanel } from "@/components/tournaments/manage/double-stage-manage-panel";
import { DoubleStageSchedulePanel } from "@/components/tournaments/manage/double-stage-schedule-panel";
import { BracketManagePanel } from "@/components/tournaments/manage/bracket-manage-panel";
import { DisplayControlPanel } from "@/components/tournaments/manage/display-control-panel";
import { DisplaySponsorBannersPanel } from "@/components/tournaments/manage/display-sponsor-banners-panel";
import { ManageOfficialDashboardPanel } from "@/components/tournaments/manage/manage-official-dashboard-panel";
import { ScoreEntryPanel } from "@/components/tournaments/manage/score-entry-panel";
import { TournamentAccessInvitesPanel } from "@/components/tournaments/tournament-access-invites-panel";
import { TournamentPlayerInvitesPanel } from "@/components/tournaments/tournament-player-invites-panel";
import { PartnerGuestRegistrationsPanel } from "@/components/partners/partner-guest-registrations-panel";
import { TournamentParticipantsPanel } from "@/components/tournaments/tournament-participants-panel";
import { TournamentSessionChrome } from "@/components/tournaments/tournament-session-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  dashboardRoutes,
  publicSportRoutes,
  partnerPublicRoutes,
} from "@/lib/constants/routes";
import { tournamentEditUrl } from "@/lib/tournaments/edit-routes";
import { isFunMatchType, isOfficialType, supportsPlayerInvites } from "@/lib/tournaments/core/types";
import type { TournamentManageAccess } from "@/lib/tournaments/manage-access";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { useManageTournamentDetail } from "@/hooks/use-manage-tournament-detail";
import { useTournamentManageScoring } from "@/hooks/use-tournament-manage-scoring";
import { OFFICIAL_BILLING_LABELS } from "@/lib/tournaments/ui/labels";
import { cpBadgeSuccessClass, cpBadgeWarningClass } from "@/lib/styles/surface-classes";
import {
  getDoubleStagePhase,
  getFormatCapabilities,
} from "@/lib/tournaments/format-capabilities";
import { getTournamentFormatLabel } from "@/lib/tournaments/settings";
import { cn } from "@/lib/utils";

function manageBaseUrl(tournament: TournamentDetail, partnerSlug?: string | null): string {
  if (tournament.partnerId && partnerSlug) {
    return partnerPublicRoutes.tournamentManage(partnerSlug, tournament.slug);
  }
  return publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug);
}

function publicTournamentUrl(tournament: TournamentDetail, partnerSlug?: string | null): string {
  if (tournament.partnerId && partnerSlug) {
    return partnerPublicRoutes.tournament(partnerSlug, tournament.slug);
  }
  return publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
}

function displayTournamentUrl(tournament: TournamentDetail, partnerSlug?: string | null): string {
  if (tournament.partnerId && partnerSlug) {
    return partnerPublicRoutes.tournamentDisplay(partnerSlug, tournament.slug);
  }
  return publicSportRoutes.tournamentDisplay(tournament.sportSlug, tournament.slug);
}

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "groups", label: "Groups", icon: LayoutGrid },
  { id: "schedule", label: "Match Schedule", icon: CalendarDays },
  { id: "scoring", label: "Live scoring", icon: Radio },
  { id: "bracket", label: "Bracket", icon: Swords },
  { id: "players", label: "Players", icon: UserRound },
  { id: "registrations", label: "Registrations", icon: Users },
  { id: "invites", label: "Invites", icon: UserPlus },
  { id: "display", label: "Display", icon: Monitor },
] as const;

/** Desktop manage nav collapse preference (icon rail vs labeled). */
const MANAGE_NAV_COLLAPSED_KEY = "gg-manage-nav-collapsed";

export type ManageSection = (typeof SECTIONS)[number]["id"];

const SECTION_META: Record<ManageSection, { title: string; description: string }> = {
  dashboard: {
    title: "Dashboard",
    description: "Overview and shortcuts for running this event.",
  },
  groups: {
    title: "Groups",
    description: "Group standings and qualification progress.",
  },
  schedule: {
    title: "Match Schedule",
    description: "Order of Play, start times, and court calls for group and knockout fixtures.",
  },
  scoring: {
    title: "Live scoring",
    description: "Start matches and record scores in real time.",
  },
  bracket: {
    title: "Bracket",
    description: "Generate, seed, and score elimination matches.",
  },
  players: {
    title: "Players",
    description: "Everyone who has joined squads for this Fun Match session.",
  },
  registrations: {
    title: "Registrations",
    description: "Review confirmed teams and player rosters.",
  },
  invites: {
    title: "Invites",
    description: "Invite staff for scoring or players for Fun Match sessions.",
  },
  display: {
    title: "Display",
    description: "Configure venue screens and full-screen scoreboards.",
  },
};

type TournamentManageShellProps = {
  tournament: TournamentDetail;
  summary: TournamentRegistrationSummary;
  access: TournamentManageAccess;
  participant: TournamentParticipantContext;
  canEdit: boolean;
  /** When set with partnerId on tournament, manage/public/display URLs stay on white-label. */
  partnerSlug?: string | null;
  partnerDisplayName?: string | null;
};

export function TournamentManageShell({
  tournament: initialTournament,
  summary,
  access,
  participant,
  canEdit,
  partnerSlug = null,
  partnerDisplayName = null,
}: TournamentManageShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: tournament = initialTournament, refetch: refetchTournament } =
    useManageTournamentDetail(
      initialTournament.sportSlug,
      initialTournament.slug,
      initialTournament,
    );
  const { data: manageScoring } = useTournamentManageScoring(
    tournament.sportSlug,
    tournament.slug,
  );
  const liveDoubleStagePhase =
    manageScoring?.doubleStage?.phase ??
    (tournament.format === "double_stage" ? getDoubleStagePhase(tournament) : null);
  const caps = getFormatCapabilities(
    liveDoubleStagePhase && tournament.format === "double_stage"
      ? {
          ...tournament,
          settings: {
            ...((tournament.settings as Record<string, unknown> | null) ?? {}),
            doubleStage: {
              ...(((tournament.settings as Record<string, unknown> | null)
                ?.doubleStage as Record<string, unknown> | undefined) ?? {}),
              ...(manageScoring?.doubleStage?.settings ?? {}),
              phase: liveDoubleStagePhase,
            },
          },
        }
      : tournament,
  );
  const showDoubleStageBracketAwaiting =
    caps.isDoubleStage && liveDoubleStagePhase === "group";

  useEffect(() => {
    if (
      tournament.format === "double_stage" &&
      liveDoubleStagePhase === "knockout" &&
      getDoubleStagePhase(tournament) === "group"
    ) {
      void refetchTournament();
    }
  }, [liveDoubleStagePhase, refetchTournament, tournament]);
  const isOfficial = isOfficialType(tournament.tournamentType);
  const isFunMatch = isFunMatchType(tournament.tournamentType);
  const isPartnerEvent = Boolean(tournament.partnerId);
  const canInvitePlayers = supportsPlayerInvites(tournament);

  const sectionMetaMap = useMemo(() => {
    if (!isPartnerEvent) return SECTION_META;
    return {
      ...SECTION_META,
      players: {
        title: "Players",
        description:
          "Curate guest registrations, then manage confirmed teams for this partner event.",
      },
      invites: {
        title: "Invites",
        description: "Invite scorekeepers and bracket managers for this event.",
      },
      display: {
        title: "Display",
        description: "Score entry mode, venue screens, and brand theme.",
      },
    };
  }, [isPartnerEvent]);

  const visibleSections = useMemo(() => {
    const canOrgAdmin = access.isOwner || access.isPartnerMember;
    return SECTIONS.filter((s) => {
      if (s.id === "groups" && !caps.showGroupsTab) return false;
      if (s.id === "schedule" && !caps.showScheduleTab) return false;
      if (s.id === "bracket" && !caps.showBracketTab) return false;
      if (s.id === "registrations" && (!isOfficial || !canOrgAdmin)) return false;
      if (s.id === "players" && !isFunMatch) return false;
      if (s.id === "invites" && !canOrgAdmin) return false;
      if (
        !access.isOwner &&
        !access.isPartnerMember &&
        access.grantRole === "scorekeeper" &&
        s.id === "bracket"
      ) {
        return false;
      }
      return true;
    });
  }, [access.grantRole, access.isOwner, access.isPartnerMember, caps, isOfficial, isFunMatch]);

  const initialSection =
    (searchParams.get("section") as ManageSection | null) ?? "dashboard";
  const [section, setSection] = useState<ManageSection>(() => {
    const requested =
      visibleSections.some((s) => s.id === initialSection) ? initialSection : "dashboard";
    return requested;
  });
  const [sectionReady, setSectionReady] = useState(true);
  /** Desktop only: collapse labeled nav to an icon rail so content uses more width. */
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [navHydrated, setNavHydrated] = useState(false);

  useEffect(() => {
    try {
      setNavCollapsed(window.localStorage.getItem(MANAGE_NAV_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
    setNavHydrated(true);
  }, []);

  useEffect(() => {
    if (!navHydrated) return;
    try {
      window.localStorage.setItem(MANAGE_NAV_COLLAPSED_KEY, navCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [navCollapsed, navHydrated]);

  const toggleNavCollapsed = useCallback(() => {
    setNavCollapsed((prev) => !prev);
  }, []);

  const navigateSection = useCallback(
    (next: ManageSection) => {
      if (next === section) return;
      setSectionReady(false);
      setSection(next);
      const url = `${manageBaseUrl(tournament, partnerSlug)}?section=${next}`;
      router.replace(url, { scroll: false });
    },
    [router, section, tournament, partnerSlug],
  );

  useEffect(() => {
    setSectionReady(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setSectionReady(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [section]);

  useEffect(() => {
    const param = searchParams.get("section") as ManageSection | null;
    const next =
      param && visibleSections.some((s) => s.id === param) ? param : null;
    if (next) {
      setSection(next);
    }
  }, [searchParams, visibleSections]);

  const sectionMeta = useMemo(() => {
    const base = sectionMetaMap[section];
    if (!caps.isDoubleStage) return base;
    if (section === "groups") {
      return {
        title: base.title,
        description:
          "Standings and qualification. Open Match Schedule for Order of Play — score in Live scoring.",
      };
    }
    if (section === "schedule") {
      return {
        title: base.title,
        description:
          "Order of Play, queue numbers, court calls, and start times. Start opens Live scoring.",
      };
    }
    if (section === "scoring" && caps.hasGroupStage) {
      return {
        title: "Live scoring — group stage",
        description:
          "Assign courts, start fixtures, finalize scores. Standings sync to Groups; leaderboard is collapsed below.",
      };
    }
    if (section === "scoring" && caps.isDoubleStage && !caps.hasGroupStage) {
      return {
        title: "Live scoring — knockout",
        description: "Score elimination bracket matches on courts in real time.",
      };
    }
    if (section === "bracket" && caps.isDoubleStage && caps.hasGroupStage) {
      return {
        title: "Bracket",
        description:
          "Knockout unlocks after the group stage finishes — the draw is created automatically from qualified teams only.",
      };
    }
    return base;
  }, [caps.hasGroupStage, caps.isDoubleStage, section, sectionMetaMap]);

  const livePhase =
    tournament.status === "live"
      ? "live"
      : tournament.status === "completed"
        ? "completed"
        : "not_started";

  const publicUrl = publicTournamentUrl(tournament, partnerSlug);
  const displayUrl = displayTournamentUrl(tournament, partnerSlug);
  const editHref = canEdit
    ? tournament.partnerId && partnerSlug
      ? dashboardRoutes.partnerTournamentEdit(tournament.id)
      : tournamentEditUrl(tournament.id, "host")
    : undefined;

  return (
    <div className="min-h-screen bg-cp-background">
      <TournamentSessionChrome
        sportSlug={tournament.sportSlug}
        slug={tournament.slug}
        tournamentId={tournament.id}
        name={tournament.name}
        phase={livePhase}
        canManage
        canEdit={canEdit}
        editHref={editHref}
        listHref={publicUrl}
        backLabel="Back to tournament"
        manageActive
        hideManageButton
        publicUrl={publicUrl}
        displayUrl={displayUrl}
        manageUrl={manageBaseUrl(tournament, partnerSlug)}
        flushTop={false}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:py-5 lg:flex-row lg:gap-5 lg:px-6">
        <nav
          aria-label="Manage sections"
          className={cn(
            "lg:sticky lg:top-4 lg:self-start lg:transition-[width] lg:duration-200 lg:ease-out",
            navCollapsed ? "lg:w-14" : "lg:w-56",
          )}
        >
          <div className="mb-2 hidden items-center justify-between gap-1 lg:flex">
            {!navCollapsed ? (
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                Sections
              </p>
            ) : (
              <span className="sr-only">Sections</span>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 shrink-0 text-cp-muted hover:bg-cp-elevated hover:text-foreground",
                navCollapsed && "mx-auto",
              )}
              onClick={toggleNavCollapsed}
              aria-expanded={!navCollapsed}
              aria-controls="manage-section-nav"
              title={navCollapsed ? "Show section labels" : "Hide section labels"}
            >
              {navCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden />
              )}
              <span className="sr-only">
                {navCollapsed ? "Expand manage menu" : "Collapse manage menu"}
              </span>
            </Button>
          </div>

          <div
            id="manage-section-nav"
            className={cn(
              "flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0",
              navCollapsed && "lg:items-stretch",
            )}
          >
            {visibleSections.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateSection(item.id)}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={cn(
                    "flex shrink-0 snap-start items-center gap-2 rounded-xl text-sm font-medium transition-colors",
                    navCollapsed
                      ? "px-3 py-2.5 lg:justify-center lg:px-0 lg:py-2.5"
                      : "px-3 py-2.5",
                    active
                      ? "bg-cp-primary text-white"
                      : "bg-cp-card text-cp-muted hover:bg-cp-elevated hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span
                    className={cn(
                      "whitespace-nowrap",
                      navCollapsed && "lg:hidden",
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <main className="min-w-0 flex-1 space-y-6">
          {section !== "dashboard" ? (
            <header
              className={cn(
                "rounded-2xl border border-cp-border bg-cp-card/60",
                section === "scoring" ? "px-4 py-2.5 sm:px-5" : "px-5 py-4",
              )}
            >
              {section === "scoring" ? (
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h1 className="text-lg font-semibold text-foreground sm:text-xl">
                    {sectionMeta.title}
                  </h1>
                  <p className="text-xs text-cp-muted sm:text-sm">{sectionMeta.description}</p>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-foreground">{sectionMeta.title}</h1>
                  <p className="mt-1 text-sm text-cp-muted">{sectionMeta.description}</p>
                </>
              )}
            </header>
          ) : null}

          <div className="relative min-h-[280px]">
            {!sectionReady ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-cp-border bg-cp-background/80 backdrop-blur-[2px]">
                <LoadingSpinner label="Loading section…" />
              </div>
            ) : null}

            <FadeInView key={section}>
            {section === "dashboard" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-cp-border bg-cp-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-xl font-semibold text-foreground">Manage tournament</h1>
                      <p className="mt-1 text-sm text-cp-muted">
                        {isPartnerEvent
                          ? getTournamentFormatLabel(tournament.format)
                          : `${isOfficial ? "Official event" : "Fun Match"} · ${getTournamentFormatLabel(tournament.format)}`}
                        {access.grantRole ? ` · Staff: ${access.grantRole}` : ""}
                      </p>
                    </div>
                    <Badge className="capitalize border-cp-border bg-cp-elevated text-foreground">
                      {tournament.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={publicUrl}>Public page</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={displayUrl}>Open display</Link>
                    </Button>
                    {access.canManageScoring ? (
                      <Button size="sm" onClick={() => navigateSection("scoring")}>
                        <Radio className="mr-1.5 h-4 w-4" />
                        Live scoring
                      </Button>
                    ) : null}
                    {caps.showBracketTab && access.canManageBracket && !caps.hasGroupStage ? (
                      <Button size="sm" variant="secondary" onClick={() => navigateSection("bracket")}>
                        <Trophy className="mr-1.5 h-4 w-4" />
                        Bracket setup
                      </Button>
                    ) : null}
                    {caps.showGroupsTab ? (
                      <Button size="sm" variant="secondary" onClick={() => navigateSection("groups")}>
                        <LayoutGrid className="mr-1.5 h-4 w-4" />
                        Groups
                      </Button>
                    ) : null}
                    {editHref ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={editHref}>Open editor</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
                {isOfficial ? (
                  <ManageOfficialDashboardPanel tournament={tournament} summary={summary} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-cp-border bg-cp-elevated/25 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-cp-muted">
                        Session
                      </p>
                      <p className="mt-1 text-lg font-semibold capitalize text-foreground">
                        {tournament.status}
                      </p>
                      <p className="mt-0.5 text-xs text-cp-muted">
                        {summary.registeredTeams} squads · {summary.registeredPlayers} players
                      </p>
                    </div>
                    <div className="rounded-xl border border-cp-border bg-cp-elevated/25 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-cp-muted">
                        Format
                      </p>
                      <p className="mt-1 text-lg font-semibold capitalize text-foreground">
                        {tournament.format.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-xs text-cp-muted">
                        Use Live scoring for host controls and courts
                      </p>
                    </div>
                  </div>
                )}
                {caps.isDoubleStage ? (
                  <ol className="rounded-xl border border-cp-border bg-cp-card/60 p-4 text-sm text-cp-muted">
                    <li className="font-medium text-foreground">Quick start</li>
                    <li className="mt-2">
                      1. <span className="text-foreground">Groups</span> — standings
                    </li>
                    <li>
                      2. <span className="text-foreground">Match Schedule</span> — Order of Play &
                      start times
                    </li>
                    <li>
                      3. <span className="text-foreground">Live scoring</span> — start & finalize
                      matches
                    </li>
                    <li>
                      4. Knockout generates when groups finish (retry from Groups if needed)
                    </li>
                    <li>5. Score KO in Live scoring · use Display for venue screens</li>
                  </ol>
                ) : (
                  <ol className="rounded-xl border border-cp-border bg-cp-card/60 p-4 text-sm text-cp-muted">
                    <li className="font-medium text-foreground">Quick start</li>
                    <li className="mt-2">1. Open Live scoring → assign courts and start matches</li>
                    {caps.showBracketTab ? (
                      <li>2. Bracket tab → generate & save seeding → set status Live</li>
                    ) : (
                      <li>2. Use round planner for Americano rotations across courts</li>
                    )}
                    <li>3. Open Display for venue screens</li>
                  </ol>
                )}
              </div>
            ) : null}

            {section === "groups" && caps.showGroupsTab ? (
              <DoubleStageManagePanel
                tournament={tournament}
                partnerSlug={partnerSlug}
                onOpenLiveScoring={() => navigateSection("scoring")}
                onOpenSchedule={() => navigateSection("schedule")}
              />
            ) : null}

            {section === "schedule" && caps.showScheduleTab ? (
              <DoubleStageSchedulePanel
                tournament={tournament}
                onOpenLiveScoring={() => navigateSection("scoring")}
              />
            ) : null}

            {section === "scoring" && !access.canManageScoring ? (
              <div className="rounded-2xl border border-cp-border bg-cp-card p-6 text-sm text-cp-muted">
                You do not have permission to manage live scoring for this tournament.
              </div>
            ) : null}

            {section === "scoring" && access.canManageScoring ? (
              <FunMatchScoringWorkspace
                tournament={tournament}
                participant={participant}
                livePhase={livePhase}
                workspaceVariant={
                  isPartnerEvent || isFunMatch ? "fun_match" : "official"
                }
                partnerDisplayName={partnerDisplayName}
              />
            ) : null}

            {section === "bracket" && caps.showBracketTab && !access.canManageBracket ? (
              <div className="rounded-2xl border border-cp-border bg-cp-card p-6 text-sm text-cp-muted">
                You do not have permission to manage the bracket for this tournament.
              </div>
            ) : null}

            {section === "bracket" && caps.showBracketTab && access.canManageBracket ? (
              showDoubleStageBracketAwaiting ? (
                <DoubleStageBracketAwaitingPanel
                  tournament={tournament}
                  onOpenGroups={() => navigateSection("groups")}
                />
              ) : (
                <BracketManagePanel
                  tournament={tournament}
                  participant={participant}
                  partnerSlug={partnerSlug}
                  onOpenLiveScoring={() => navigateSection("scoring")}
                  onOpenGroups={() => navigateSection("groups")}
                />
              )
            ) : null}

            {section === "players" && isFunMatch ? (
              <div className="space-y-5">
                {isPartnerEvent ? (
                  <PartnerGuestRegistrationsPanel
                    sportSlug={tournament.sportSlug}
                    slug={tournament.slug}
                    canCurate={access.isOwner || access.isPartnerMember}
                  />
                ) : null}
                <div className="rounded-2xl border border-cp-border bg-cp-card p-5">
                  <TournamentParticipantsPanel
                    sportSlug={tournament.sportSlug}
                    slug={tournament.slug}
                    tournamentType="fun_match"
                    variant="reclub"
                    canRemoveTeams={access.isOwner || access.isPartnerMember}
                    partnerEvent={isPartnerEvent}
                    liveRefresh
                  />
                </div>
              </div>
            ) : null}

            {section === "registrations" && isOfficial ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-cp-border bg-cp-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">Registrations</h2>
                      <p className="mt-1 text-sm text-cp-muted">
                        {summary.registeredTeams} teams · {summary.registeredPlayers} players
                        {summary.maxTeams != null ? ` · capacity ${summary.maxTeams}` : ""}
                      </p>
                    </div>
                    {tournament.officialBilling === "paid" ? (
                      <Badge className={cpBadgeWarningClass}>
                        {OFFICIAL_BILLING_LABELS.paid} — payment status per player below
                      </Badge>
                    ) : (
                      <Badge className={cpBadgeSuccessClass}>
                        {OFFICIAL_BILLING_LABELS.free}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <TournamentParticipantsPanel
                      sportSlug={tournament.sportSlug}
                      slug={tournament.slug}
                      tournamentType="official"
                      variant="official"
                      officialBilling={tournament.officialBilling}
                      canRemoveTeams
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {section === "invites" && (access.isOwner || access.isPartnerMember) ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-foreground">Staff access</h2>
                  <p className="mt-1 text-sm text-cp-muted">
                    {isPartnerEvent
                      ? "Invite scorekeepers and bracket managers with a reusable link or code (valid 7 days). Partner staff can create or revoke access."
                      : "Invite scorekeepers and bracket managers with a reusable link or code (valid 7 days). Only you can create or revoke staff access."}
                  </p>
                  <div className="mt-4">
                    <TournamentAccessInvitesPanel
                      sportSlug={tournament.sportSlug}
                      slug={tournament.slug}
                      embedded
                    />
                  </div>
                </div>
                {canInvitePlayers ? (
                  <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
                    <h2 className="text-base font-semibold text-foreground">Player invites</h2>
                    <p className="mt-1 text-sm text-cp-muted">
                      {isFunMatch
                        ? "Share a reusable link or code (valid 7 days) so players can enter teams."
                        : "Share a reusable link or code (valid 7 days) so players can register for this free event."}
                    </p>
                    <div className="mt-4">
                      <TournamentPlayerInvitesPanel
                        sportSlug={tournament.sportSlug}
                        slug={tournament.slug}
                        embedded
                        variant={isFunMatch ? "fun_match" : "official_free"}
                      />
                    </div>
                  </div>
                ) : isPartnerEvent ? (
                  <div className="rounded-2xl border border-dashed border-cp-border bg-cp-card/50 p-4 sm:p-5">
                    <h2 className="text-sm font-semibold text-foreground">Guest registration</h2>
                    <p className="mt-1 text-sm text-cp-muted">
                      Players join through your public registration form — not Gud Game invite codes.
                      Share the tournament page from Display or Open site.
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-3 border-cp-border">
                      <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
                        Open registration page
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {section === "display" ? (
              access.isOwner || access.isPartnerMember ? (
                <div className="space-y-5">
                  <ScoreEntryPanel
                    tournament={tournament}
                    onSaved={() => void refetchTournament()}
                  />
                  <DisplayControlPanel
                    tournament={tournament}
                    partnerSlug={partnerSlug}
                    onSaved={() => void refetchTournament()}
                  />
                  <DisplaySponsorBannersPanel
                    tournament={tournament}
                    onSaved={() => void refetchTournament()}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-cp-border bg-cp-card p-6 text-sm text-cp-muted">
                  Only the organizer or partner staff can change display and score entry settings.
                  You can still open the venue display from the header.
                </div>
              )
            ) : null}
            </FadeInView>
          </div>
        </main>
      </div>
    </div>
  );
}
