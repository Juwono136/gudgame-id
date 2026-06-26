import { PageShell } from "@/components/layout/page-shell";
import { PageContentSkeleton } from "@/components/skeletons/page-content-skeleton";

export default function NewsLoading() {
  return (
    <PageShell>
      <PageContentSkeleton />
    </PageShell>
  );
}
