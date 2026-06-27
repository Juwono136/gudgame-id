import { redirect } from "next/navigation";
import { publicSportRoutes } from "@/lib/constants/routes";

type PageProps = {
  params: Promise<{ sportSlug: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy invite URLs from backend buildInviteUrl */
export default async function LegacyTournamentInviteRedirect({
  params,
  searchParams,
}: PageProps) {
  const { sportSlug, slug } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string") qs.set(key, val);
  }
  const q = qs.toString();
  redirect(
    `${publicSportRoutes.tournamentInvite(sportSlug, slug)}${q ? `?${q}` : ""}`,
  );
}
