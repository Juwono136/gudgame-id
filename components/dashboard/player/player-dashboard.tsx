import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileCompletionBanner } from "@/components/dashboard/profile-completion-banner";
import { PlayerDashboardToolbar } from "@/components/dashboard/player/player-dashboard-toolbar";
import { PlayerPageCompletionPrompt } from "@/components/dashboard/player/player-page-completion-prompt";
import { DashboardQuickLinks } from "@/components/dashboard/dashboard-quick-links";
import { DashboardWelcomeCard } from "@/components/dashboard/dashboard-welcome-card";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import { PlayerCareerStatsSection } from "@/components/wiki/player/player-career-stats";
import {
  PlayerRecentMatchesSection,
  PlayerTournamentHistorySection,
} from "@/components/wiki/player/player-matches-section";
import { PlayerSidebar } from "@/components/wiki/player/player-sidebar";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
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
    accountCompletion,
    playerProfile,
    playerPageCompletion,
    recentMatches,
    recentTournaments,
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

  return (
    <DashboardWorkspaceShell
      roles={roles}
      variant="player"
      title="Overview"
      description="Profile, sessions, and match history at a glance."
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

      <DashboardQuickLinks
        items={[
          {
            href: `${dashboardRoutes.tournaments}?scope=created`,
            label: "My sessions",
            description: "Tournaments you created",
            icon: "gamepad2",
            accent: "emerald",
          },
          {
            href: `${dashboardRoutes.tournaments}?scope=joined`,
            label: "Joined",
            description: "Events you played in",
            icon: "users",
          },
          {
            href: dashboardRoutes.matches,
            label: "Match log",
            description: "Scores and results",
            icon: "swords",
          },
          {
            href: dashboardRoutes.settings,
            label: "Settings",
            description: "Profile & account",
            icon: "settings",
            accent: "primary",
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
                <RichHtmlContent html={playerProfile.biography} variant="article" />
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
                Host a free reclub session
              </h2>
              <p className="mt-1 text-sm text-cp-muted">
                Create a recreational tournament for friends and club mates. No registration
                fee, no official ranking impact.
              </p>
              <Button asChild size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-500">
                <Link href={dashboardRoutes.tournamentsNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create reclub tournament
                </Link>
              </Button>
            </div>

            <PlayerRecentMatchesSection
              matches={recentMatches}
              viewAllHref={dashboardRoutes.matches}
            />
            <PlayerTournamentHistorySection
              tournaments={recentTournaments}
              viewAllHref={dashboardRoutes.tournaments}
              createReclubHref={dashboardRoutes.tournamentsNew}
            />
          </div>

          <div className="order-1 lg:order-2">
            <PlayerSidebar
              displayName={playerProfile.displayName}
              nationality={playerProfile.nationality}
              age={playerProfile.age}
              yearsActive={playerProfile.yearsActive}
              signatureGear={signatureGear}
              socialLinks={playerProfile.socialLinks}
              equipment={equipment}
              galleryUrls={galleryUrls}
            />
            <div className="mt-5">
              <Button asChild variant="outline" className="w-full border-cp-border">
                <Link href={`${dashboardRoutes.settings}#player-profile`}>
                  Edit player page in My Settings
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
