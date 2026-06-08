import { PageShell } from "@/components/layout/page-shell";
import { ContentHeader } from "@/components/layout/content-header";
import { PageContentSkeleton } from "@/components/skeletons/page-content-skeleton";
import { pageMeta } from "@/lib/constants/pages";

export default function NewsPage() {
  const meta = pageMeta.news;
  return (
    <PageShell>
      <ContentHeader title={meta.title} description={meta.description} />
      <PageContentSkeleton />
    </PageShell>
  );
}
