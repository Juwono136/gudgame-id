"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  LayoutGrid,
  Monitor,
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
import { BracketManagePanel } from "@/components/tournaments/manage/bracket-manage-panel";
import { DisplayControlPanel } from "@/components/tournaments/manage/display-control-panel";
import { ManageOfficialDashboardPanel } from "@/components/tournaments/manage/manage-official-dashboard-panel";
import { ManagePlayerRosterPanel } from "@/components/tournaments/manage/manage-player-roster-panel";
import { TournamentAccessInvitesPanel } from "@/components/tournaments/tournament-access-invites-panel";
import { TournamentPlayerInvitesPanel } from "@/components/tournaments/tournament-player-invites-panel";
import { TournamentParticipantsPanel } from "@/components/tournaments/tournament-participants-panel";
import { TournamentSessionChrome } from "@/components/tournaments/tournament-session-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { publicSportRoutes } from "@/lib/constants/routes";
import { tournamentEditUrl } from "@/lib/tournaments/edit-routes";
import { isFunMatchType, isOfficialType, supportsPlayerInvites } from "@/lib/tournaments/core/types";
import type { TournamentManageAccess } from "@/lib/tournaments/manage-access";
import type { TournamentRegistrationSummary } from "@/lib/tournaments/registration/service";
import type { TournamentParticipantContext } from "@/lib/tournaments/participant-access";
import type { TournamentDetail } from "@/lib/tournaments/service";
import { useManageTournamentDetail } from "@/hooks/use-manage-tournament-detail";
import { OFFICIAL_BILLING_LABELS } from "@/lib/tournaments/ui/labels";
import { cpBadgeSuccessClass, cpBadgeWarningClass } from "@/lib/styles/surface-classes";
import { getFormatCapabilities } from "@/lib/tournaments/format-capabilities";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "groups", label: "Groups", icon: LayoutGrid },
  { id: "scoring", label: "Live scoring", icon: Radio },
  { id: "bracket", label: "Bracket", icon: Swords },
  { id: "players", label: "Players", icon: UserRound },
  { id: "registrations", label: "Registrations", icon: Users },
  { id: "invites", label: "Invites", icon: UserPlus },
  { id: "display", label: "Display", icon: Monitor },
] as const;

export type ManageSection = (typeof SECTIONS)[number]["id"];

const SECTION_META: Record<ManageSection, { title: string; description: string }> = {
  dashboard: {
    title: "Dashboard",
    description: "Overview and shortcuts for running this event.",
  },
  groups: {
    title: "Groups",
    description: "Group standings, fixtures, and qualification progress (read-only overview).",
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
};

export function TournamentManageShell({
  tournament: initialTournament,
  summary,
  access,
  participant,
  canEdit,
}: TournamentManageShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: tournament = initialTournament, refetch: refetchTournament } =
    useManageTournamentDetail(
      initialTournament.sportSlug,
      initialTournament.slug,
      initialTournament,
    );
  const caps = getFormatCapabilities(tournament);
  const isOfficial = isOfficialType(tournament.tournamentType);
  const isFunMatch = isFunMatchType(tournament.tournamentType);
  const canInvitePlayers = supportsPlayerInvites(tournament);

  const visibleSections = useMemo(() => {
    return SECTIONS.filter((s) => {
      if (s.id === "groups" && !caps.showGroupsTab) return false;
      if (s.id === "bracket" && !caps.showBracketTab) return false;
      if (s.id === "registrations" && (!isOfficial || !access.isOwner)) return false;
      if (s.id === "players" && !isFunMatch) return false;
      if (s.id === "invites" && !access.isOwner) return false;
      if (
        !access.isOwner &&
        access.grantRole === "scorekeeper" &&
        s.id === "bracket"
      ) {
        return false;
      }
      return true;
    });
  }, [access.grantRole, access.isOwner, caps, isOfficial, isFunMatch]);

  const initialSection =
    (searchParams.get("section") as ManageSection | null) ?? "dashboard";
  const [section, setSection] = useState<ManageSection>(() => {
    const requested =
      visibleSections.some((s) => s.id === initialSection) ? initialSection : "dashboard";
    return requested;
  });
  const [sectionReady, setSectionReady] = useState(true);

  const navigateSection = useCallback(
    (next: ManageSection) => {
      if (next === section) return;
      setSectionReady(false);
      setSection(next);
      const url = `${publicSportRoutes.tournamentManage(tournament.sportSlug, tournament.slug)}?section=${next}`;
      router.replace(url, { scroll: false });
    },
    [router, section, tournament.slug, tournament.sportSlug],
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
    const base = SECTION_META[section];
    if (!caps.isDoubleStage) return base;
    if (section === "groups") {
      return {
        title: base.title,
        description:
          "Standings, fixtures, and match schedule. Score in Live scoring — Qualified / Eliminated badges appear only when every group fixture is finished.",
      };
    }
    if (section === "scoring" && caps.hasGroupStage) {
      return {
        title: "Live scoring — group stage",
        description:
          "Start group fixtures and save final scores. Standings sync to the Groups tab instantly.",
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
  }, [caps.hasGroupStage, caps.isDoubleStage, section]);

  const livePhase =
    tournament.status === "live"
      ? "live"
      : tournament.status === "completed"
        ? "completed"
        : "not_started";

  const publicUrl = publicSportRoutes.tournament(tournament.sportSlug, tournament.slug);
  const displayUrl = publicSportRoutes.tournamentDisplay(tournament.sportSlug, tournament.slug);

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
        editHref={canEdit ? tournamentEditUrl(tournament.id, "host") : undefined}
        listHref={publicUrl}
        backLabel="Back to tournament"
        manageActive
        hideManageButton
      />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <nav className="lg:w-56 lg:shrink-0">
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {visibleSections.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateSection(item.id)}
                  className={cn(
                    "flex shrink-0 snap-start items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-cp-primary text-white"
                      : "bg-cp-card text-cp-muted hover:bg-cp-elevated hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <main className="min-w-0 flex-1 space-y-6">
          {section !== "dashboard" ? (
            <header className="rounded-2xl border border-cp-border bg-cp-card/60 px-5 py-4">
              <h1 className="text-xl font-semibold text-foreground">{sectionMeta.title}</h1>
              <p className="mt-1 text-sm text-cp-muted">{sectionMeta.description}</p>
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
                        {isOfficial ? "Official event" : "Fun Match"} · {tournament.format}
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
                    {canEdit ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={tournamentEditUrl(tournament.id, "host")}>Open editor</Link>
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
                  <ol className="rounded-2xl border border-cp-border bg-cp-card/60 p-5 text-sm text-cp-muted">
                    <li className="font-medium text-foreground">Quick start — double stage</li>
                    <li className="mt-2">
                      1. <span className="text-foreground">Groups</span> — check standings & fixtures
                    </li>
                    <li>
                      2. <span className="text-foreground">Live scoring</span> — start & save group
                      match scores
                    </li>
                    <li>
                      3. When all group matches finish → knockout bracket generates automatically
                      (retry from Groups if needed). Set kickoff times on the Groups schedule board.
                    </li>
                    <li>
                      4. Score elimination in Live scoring — open Display for venue screens
                    </li>
                  </ol>
                ) : (
                  <ol className="rounded-2xl border border-cp-border bg-cp-card/60 p-5 text-sm text-cp-muted">
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
                onOpenLiveScoring={() => navigateSection("scoring")}
              />
            ) : null}

            {section === "scoring" && !access.canManageScoring ? (
              <div className="rounded-2xl border border-cp-border bg-cp-card p-6 text-sm text-cp-muted">
                You do not have permission to manage live scoring for this tournament.
              </div>
            ) : null}

            {section === "scoring" &&
            access.canManageScoring &&
            !(caps.isDoubleStage && caps.hasGroupStage) ? (
              <FunMatchScoringWorkspace
                tournament={tournament}
                participant={participant}
                livePhase={livePhase}
                workspaceVariant={isFunMatch ? "fun_match" : "official"}
              />
            ) : null}

            {section === "scoring" &&
            access.canManageScoring &&
            caps.isDoubleStage &&
            caps.hasGroupStage ? (
              <FunMatchScoringWorkspace
                tournament={tournament}
                participant={participant}
                livePhase={livePhase}
                workspaceVariant="official"
              />
            ) : null}

            {section === "bracket" && caps.showBracketTab && !access.canManageBracket ? (
              <div className="rounded-2xl border border-cp-border bg-cp-card p-6 text-sm text-cp-muted">
                You do not have permission to manage the bracket for this tournament.
              </div>
            ) : null}

            {section === "bracket" && caps.showBracketTab && access.canManageBracket ? (
              caps.isDoubleStage && caps.hasGroupStage ? (
                <DoubleStageBracketAwaitingPanel
                  tournament={tournament}
                  onOpenGroups={() => navigateSection("groups")}
                />
              ) : (
                <BracketManagePanel
                  tournament={tournament}
                  participant={participant}
                  onOpenLiveScoring={() => navigateSection("scoring")}
                  onOpenGroups={() => navigateSection("groups")}
                />
              )
            ) : null}

            {section === "players" && isFunMatch ? (
              <div className="rounded-2xl border border-cp-border bg-cp-card p-5">
                <TournamentParticipantsPanel
                  sportSlug={tournament.sportSlug}
                  slug={tournament.slug}
                  tournamentType="fun_match"
                  variant="reclub"
                />
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
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {section === "invites" && access.isOwner ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-foreground">Staff access</h2>
                  <p className="mt-1 text-sm text-cp-muted">
                    Invite scorekeepers and bracket managers. Only you (the organizer) can create or
                    revoke staff invites — platform admins cannot access this tournament unless invited.
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
                        ? "Send join links so players can enter teams before the session starts."
                        : "Share invite links so players can register for this free official event."}
                    </p>
                    <div className="mt-4">
                      <TournamentPlayerInvitesPanel
                        sportSlug={tournament.sportSlug}
                        slug={tournament.slug}
                        embedded
                        variant={isFunMatch ? "fun_match" : "official_free"}
                      />
                    </div>
                    <div className="mt-6 border-t border-cp-border pt-6">
                      <ManagePlayerRosterPanel
                        sportSlug={tournament.sportSlug}
                        slug={tournament.slug}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {section === "display" ? (
              <DisplayControlPanel
                tournament={tournament}
                onSaved={() => void refetchTournament()}
              />
            ) : null}
            </FadeInView>
          </div>
        </main>
      </div>
    </div>
  );
}
