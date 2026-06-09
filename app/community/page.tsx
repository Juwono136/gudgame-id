import { PageShell } from "@/components/layout/page-shell";
import { ContentHeader } from "@/components/layout/content-header";
import { ComingSoonPlaceholder } from "@/components/layout/coming-soon-placeholder";
import { pageMeta } from "@/lib/constants/pages";

export default function CommunityPage() {
  const meta = pageMeta.community;
  return (
    <PageShell>
      <ContentHeader title={meta.title} description={meta.description} />
      <ComingSoonPlaceholder title={meta.title} description={meta.description} />
    </PageShell>
  );
}
