import { notFound } from "next/navigation";
import { PartnerPublicEligibilitySearch } from "@/components/partners/partner-public-eligibility-search";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { partnerPageClass } from "@/lib/partners/layout";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerPlayersPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const primary = partner.branding.primaryColor ?? "#0d9488";

  return (
    <div className={partnerPageClass("py-10 sm:py-14")}>
      <div
        className="mx-auto max-w-3xl rounded-[1.5rem] border border-cp-border/80 bg-cp-card/80 p-5 shadow-sm backdrop-blur-sm sm:p-7"
        style={{
          background: `linear-gradient(125deg, ${primary}14 0%, transparent 55%), var(--cp-card, transparent)`,
        }}
      >
        <PartnerPublicEligibilitySearch
          partnerSlug={partner.slug}
          partnerName={partner.displayName}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  return {
    title: partner ? `Players · ${partner.displayName}` : "Players",
  };
}
