import { notFound } from "next/navigation";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { PartnerLeaguesDirectory } from "@/components/partners/partner-leagues-directory";
import { getActivePartnerBySlug } from "@/lib/partners/service";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import { partnerPageClass } from "@/lib/partners/layout";

type PageProps = { params: Promise<{ partnerSlug: string }> };

export default async function PartnerPublicLeaguesPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  const partner = await getActivePartnerBySlug(partnerSlug);
  if (!partner) notFound();

  const primary = partner.branding.primaryColor ?? "#0d9488";

  return (
    <div className={partnerPageClass("py-10 sm:py-12")}>
      <section
        className="mb-8 overflow-hidden rounded-[1.5rem] border border-cp-border/80 bg-cp-card/70 p-5 shadow-sm sm:p-7"
        style={{
          background: `linear-gradient(125deg, ${primary}18 0%, transparent 48%, ${primary}0c 100%)`,
        }}
      >
        <PartnerPageHeader
          backHref={partnerPublicRoutes.home(partner.slug)}
          backLabel="Home"
          title="Leagues"
          description={`Season standings and fixtures from ${partner.displayName}.`}
        />
      </section>

      <PartnerLeaguesDirectory mode="public" partnerSlug={partner.slug} />
    </div>
  );
}
