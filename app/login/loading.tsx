import { PageShell } from "@/components/layout/page-shell";
import { AuthPageSkeleton } from "@/components/skeletons/page-content-skeleton";

export default function LoginLoading() {
  return (
    <PageShell showGridBackground={false}>
      <AuthPageSkeleton />
    </PageShell>
  );
}
