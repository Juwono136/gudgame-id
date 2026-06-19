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
        />
      </Suspense>
    </PageShell>
  );
}
