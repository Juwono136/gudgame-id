import { PageShell } from "@/components/layout/page-shell";
import { RosterClaimClient } from "@/components/tournaments/roster-claim-client";
import { getServerSession } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function TournamentRosterClaimPage({
  params,
  searchParams,
}: PageProps) {
  const { sportSlug, slug } = await params;
  const { token = "" } = await searchParams;
  const session = await getServerSession();

  return (
    <PageShell>
      <RosterClaimClient
        sportSlug={sportSlug}
        slug={slug}
        token={token}
        isAuthenticated={Boolean(session?.user)}
        sessionEmail={session?.user?.email ?? null}
      />
    </PageShell>
  );
}
