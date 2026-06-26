import { PageShell } from "@/components/layout/page-shell";
import { AuthPageSkeleton } from "@/components/skeletons/page-content-skeleton";

export default function RegisterLoading() {
  return (
    <PageShell showGridBackground={false}>
      <AuthPageSkeleton />
    </PageShell>
  );
}
