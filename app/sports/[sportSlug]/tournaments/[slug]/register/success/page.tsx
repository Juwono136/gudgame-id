import { PageShell } from "@/components/layout/page-shell";
import { RegistrationSuccessContent } from "@/components/tournaments/registration-success-content";
import { isUuid, parseEntityIdParam } from "@/lib/domain/uuid";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
  searchParams: Promise<{ registrationId?: string }>;
};

export default async function RegistrationSuccessPage({ params, searchParams }: PageProps) {
  await requireSession();
  const { sportSlug, slug } = await params;
  const { registrationId } = await searchParams;
  const tournament = await getTournamentBySlug(sportSlug, slug);
  if (!tournament || tournament.partnerId) notFound();

  if (!registrationId?.trim() || !isUuid(registrationId.trim())) {
    redirect(`/sports/${sportSlug}/tournaments/${slug}`);
  }
  const regId = parseEntityIdParam(registrationId, "registration id");

  return (
    <PageShell>
      <RegistrationSuccessContent registrationId={regId} sportSlug={sportSlug} slug={slug} />
    </PageShell>
  );
}
