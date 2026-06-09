import Link from "next/link";
import { ArrowRight, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileCompletionBanner } from "@/components/dashboard/profile-completion-banner";
import { PlayerDashboardToolbar } from "@/components/dashboard/player/player-dashboard-toolbar";
import { PlayerPageCompletionPrompt } from "@/components/dashboard/player/player-page-completion-prompt";
import { PlayerHero } from "@/components/wiki/player/player-hero";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import { PlayerCareerStatsSection } from "@/components/wiki/player/player-career-stats";
import {
  PlayerRecentMatchesSection,
  PlayerTournamentHistorySection,
} from "@/components/wiki/player/player-matches-section";
import { PlayerSidebar } from "@/components/wiki/player/player-sidebar";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { ProfileRoleBadges } from "@/components/layout/profile-role-badges";
import { dashboardRoutes } from "@/lib/constants/routes";
import type { PlayerDashboardView } from "@/lib/account/player-dashboard/get-dashboard";
import { resolveWikiImageUrl } from "@/lib/storage/resolve-wiki-image";

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

  const badges: { label: string; variant: "nationality" | "tier" | "default" }[] = [];
  if (playerProfile?.careerStats.tier) {
    badges.push({
      label: `${playerProfile.careerStats.tier.toUpperCase()} TIER`,
      variant: "tier",
    });
  }
  if (playerProfile?.nationality) {
    badges.push({
      label: playerProfile.nationality.toUpperCase(),
      variant: "nationality",
    });
  }

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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      {!accountCompletion.isComplete ? (
        <ProfileCompletionBanner
          completionPercent={accountCompletion.completionPercent}
          missingFields={accountCompletion.missingFields}
          className="mb-6"
        />
      ) : null}

      <PlayerPageCompletionPrompt
        completion={playerPageCompletion}
        className="mb-6"
      />

      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cp-primary">
            Player dashboard
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
            Welcome back, {heroName}
          </h1>
          <p className="mt-1 text-sm text-cp-muted">{account.email}</p>
          <ProfileRoleBadges roles={roles} className="mt-3" />
        </div>
        <PlayerDashboardToolbar publicPageUrl={playerProfile?.publicUrl} />
      </div>

      <PlayerHero
        displayName={heroName}
        summary={heroSummary}
        imageUrl={heroImage}
        badges={badges}
      />

      {!playerProfile ? (
        <PlayerPageCard
          title="Your public player page"
          description="Not created yet"
          className="mt-8"
          variant="highlight"
        >
          <div className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cp-primary/15 text-cp-primary">
              <UserCircle className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                You haven&apos;t published a player page yet
              </p>
              <p className="mt-1 text-sm text-cp-muted">
                Build your public profile with biography, equipment, and gallery — just like the
                player pages on the main site. Start in My Settings under{" "}
                <strong className="font-medium text-foreground">Player page</strong>.
              </p>
            </div>
            <Button asChild className="shrink-0 rounded-lg bg-cp-primary font-semibold">
              <Link href={`${dashboardRoutes.settings}#player-profile`}>
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PlayerPageCard>
      ) : (
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

            <PlayerRecentMatchesSection
              matches={recentMatches}
              viewAllHref={dashboardRoutes.matches}
            />
            <PlayerTournamentHistorySection
              tournaments={recentTournaments}
              viewAllHref={dashboardRoutes.tournaments}
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
      )}
    </div>
  );
}
