import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { PageShell } from "@/components/layout/page-shell";
import { HostDashboard } from "@/components/dashboard/host-dashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { getServerSession } from "@/lib/auth/session";
import { requireHostDashboardAccess } from "@/lib/auth/role-guard";
import { getMediaProxyPath, resolveUserImageUrl } from "@/lib/storage/media-url";
import { getPlayerWikiProfileForUser } from "@/lib/account/player-profile/service";
import { getUserSportInterests } from "@/lib/account/player-performance/sport-interests";
import { getProfileCompletionSnapshotForUser } from "@/lib/auth/profile-completion";
import { resolveDashboardSportContext } from "@/lib/dashboard/sport-context";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Host Dashboard",
};

export default async function HostDashboardPage() {
  const { roles, userId } = await requireHostDashboardAccess();
  const session = await getServerSession();

  const [dbUser] = await getDb()
    .select({
      name: user.name,
      fullNameKtp: user.fullNameKtp,
      image: user.image,
      imageStorageKey: user.imageStorageKey,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const userImageUrl = dbUser
    ? (resolveUserImageUrl(dbUser.image) ??
      (dbUser.imageStorageKey ? getMediaProxyPath(dbUser.imageStorageKey) : null))
    : null;

  const userName =
    dbUser?.fullNameKtp ?? dbUser?.name ?? session?.user?.name ?? "Host";
  const userEmail = session?.user?.email ?? "";
  const sportCtx = await resolveDashboardSportContext(userId);
  const activeSportName =
    sportCtx.availableSports.find((s) => s.slug === sportCtx.sportSlug)?.name ??
    sportCtx.sportSlug;

  const playerProfile = roles.includes("player")
    ? await getPlayerWikiProfileForUser(userId, sportCtx.sportSlug)
    : null;
  const sportInterests = await getUserSportInterests(userId);
  const profileCompletion = await getProfileCompletionSnapshotForUser(userId);

  return (
    <PageShell showGridBackground={false}>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <LoadingSpinner label="Loading host dashboard…" />
          </div>
        }
      >
        <HostDashboard
          userName={userName}
          userEmail={userEmail}
          userImageUrl={userImageUrl}
          roles={roles}
          publicPageUrl={playerProfile?.publicUrl ?? null}
          sportInterests={sportInterests}
          profileCompletion={profileCompletion}
          activeSportName={activeSportName}
        />
      </Suspense>
    </PageShell>
  );
}
