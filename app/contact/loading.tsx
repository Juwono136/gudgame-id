import { PageShell } from "@/components/layout/page-shell";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ContactLoading() {
  return (
    <PageShell>
      <div className="flex justify-center py-24">
        <LoadingSpinner label="Loading contact…" />
      </div>
    </PageShell>
  );
}
