import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileCompletionBanner } from "@/components/dashboard/profile-completion-banner";
import { PlayerDashboardToolbar } from "@/components/dashboard/player/player-dashboard-toolbar";
import { PlayerPageCompletionPrompt } from "@/components/dashboard/player/player-page-completion-prompt";
import { DashboardQuickLinks } from "@/components/dashboard/dashboard-quick-links";
import { DashboardWelcomeCard } from "@/components/dashboard/dashboard-welcome-card";
import { SportInterestsDisplay } from "@/components/shared/sport-interests-display";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import { ExpandableBiography } from "@/components/wiki/player/expandable-biography";
import { PlayerCareerStatsSection } from "@/components/wiki/player/player-career-stats";
import {
  PlayerRecentMatchesSection,
  PlayerTournamentHistorySection,
} from "@/components/wiki/player/player-matches-section";
import { PlayerSidebar } from "@/components/wiki/player/player-sidebar";
import { DashboardWorkspaceShell } from "@/components/dashboard/dashboard-workspace-shell";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { PlayerDashboardView } from "@/lib/account/player-dashboard/get-dashboard";
import { resolveWikiImageUrl } from "@/lib/media/client";

type PlayerDashboardProps = {
  data: PlayerDashboardView;
};

export function PlayerDashboard({ data }: PlayerDashboardProps) {
  const {
    account,
    roles,
    activeSport,
    accountCompletion,
    playerProfile,
    playerPageCompletion,
    recentMatches,
    recentTournaments,
    sportInterests,
  } = data;

  const heroName = playerProfile?.displayName || account.displayName || account.name || "Player";
  const heroImage =
    playerProfile?.primaryImageUrl ?? account.imageUrl ?? null;
  const heroSummary = playerProfile?.summary ?? null;

  const galleryUrls =
    playerProfile?.gallery
      .map((g) => resolveWikiImageUrl(g.url))
      .filter((u): u is string => Boolean(u)) ?? [];

  const signatureGear = playerProfile?.signatureGear ?? null;
  const equipment =
    signatureGear && playerProfile
      ? playerProfile.equipment.filter((item) => item.id !== signatureGear.id)
      : (playerProfile?.equipment ?? []);

  const displaySportName = activeSport.name;

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title="Overview"
      description={`${displaySportName} — profile, sessions, and match history at a glance.`}
      actions={<PlayerDashboardToolbar publicPageUrl={playerProfile?.publicUrl} />}
    >
      <DashboardWelcomeCard
        displayName={heroName}
        email={account.email}
        imageUrl={heroImage}
        roles={roles}
        subtitle={heroSummary ? undefined : "Complete your profile to unlock the full player experience."}
        action={
          playerProfile?.publicUrl
            ? { label: "View public page", href: playerProfile.publicUrl }
            : { label: "Open settings", href: `${dashboardRoutes.settings}#player-profile` }
        }
      />

      {sportInterests.length > 0 ? (
        <div className="rounded-2xl border border-cp-border bg-cp-card/60 px-4 py-3 sm:px-5 sm:py-4">
          <SportInterestsDisplay
            items={sportInterests}
            title="Sports you follow"
            description="Visible on your public player profile"
          />
        </div>
      ) : null}

      <DashboardQuickLinks
        items={[
          {
            href: `${dashboardRoutes.tournaments}?scope=created`,
            label: "My sessions",
            description: "Fun Match events you organize",
            icon: "gamepad2",
            accent: "emerald",
          },
          {
            href: `${dashboardRoutes.tournaments}?scope=history`,
            label: "Match history",
            description: "Scores, opponents, and stats",
            icon: "swords",
            accent: "primary",
          },
          {
            href: dashboardRoutes.tournamentsNew,
            label: "Create Fun Match",
            description: "Start a community session",
            icon: "plus",
          },
          {
            href: dashboardRoutes.settings,
            label: "Settings",
            description: "Profile & account",
            icon: "settings",
          },
        ]}
      />

      {!accountCompletion.isComplete ? (
        <ProfileCompletionBanner
          completionPercent={accountCompletion.completionPercent}
          missingFields={accountCompletion.missingFields}
        />
      ) : null}

      <PlayerPageCompletionPrompt completion={playerPageCompletion} />

      {playerProfile ? (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-3 lg:gap-8">
          <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
            <PlayerCareerStatsSection stats={playerProfile.careerStats} />

            {playerProfile.biography ? (
              <PlayerPageCard title="Biography">
                <ExpandableBiography html={playerProfile.biography} />
                <div className="mt-4 border-t border-cp-border pt-4">
                  <Button asChild variant="outline" size="sm" className="border-cp-border">
                    <Link href={`${dashboardRoutes.settings}#player-profile`}>
                      Edit biography
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </PlayerPageCard>
            ) : (
              <PlayerPageCard
                title="Biography"
                description="Tell your story on your public page"
              >
                <p className="text-sm text-cp-muted">
                  Add a biography in My Settings so visitors can learn about your playing style,
                  career, and achievements.
                </p>
                <Button asChild size="sm" className="mt-4 rounded-lg bg-cp-primary">
                  <Link href={`${dashboardRoutes.settings}#player-profile`}>
                    Add biography
                  </Link>
                </Button>
              </PlayerPageCard>
            )}

            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Community play
              </p>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                Host a free Fun Match
              </h2>
              <p className="mt-1 text-sm text-cp-muted">
                Create a Fun Match for friends and club mates. No registration
                fee, no official ranking impact.
              </p>
              <Button asChild size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-500">
                <Link href={dashboardRoutes.tournamentsNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Fun Match
                </Link>
              </Button>
            </div>

            <PlayerRecentMatchesSection
              matches={recentMatches}
              viewAllHref={`${dashboardRoutes.tournaments}?scope=history`}
              sportSlug={playerProfile.sportSlug}
              playerSlug={playerProfile.slug}
              playerName={heroName}
            />
            <PlayerTournamentHistorySection
              tournaments={recentTournaments}
              viewAllHref={dashboardRoutes.tournaments}
              createReclubHref={dashboardRoutes.tournamentsNew}
              sportSlug={playerProfile.sportSlug}
              playerSlug={playerProfile.slug}
              playerName={heroName}
            />
          </div>

          <div className="order-1 lg:order-2">
            <PlayerSidebar
              sportSlug={playerProfile.sportSlug}
              displayName={playerProfile.displayName}
              nationality={playerProfile.nationality}
              age={playerProfile.age}
              yearsActive={playerProfile.yearsActive}
              sportInterests={sportInterests}
              signatureGear={signatureGear}
              socialLinks={playerProfile.socialLinks}
              equipment={equipment}
              galleryUrls={galleryUrls}
            />
            <div className="mt-5">
              <Button asChild variant="outline" className="w-full border-cp-border">
                <Link href={`${dashboardRoutes.settings}#player-profile`}>
                  Edit player page
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardWorkspaceShell>
  );
}
