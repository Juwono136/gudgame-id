import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { WikiEntityWizard } from "@/components/admin/wiki/wiki-entity-wizard";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { adminRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "Create Wiki Entity",
};

export default async function NewWikiEntityPage() {
  const context = await requireWikiManagementAccess();

  return (
    <AdminShell context={context} title="Create New Wiki Entity">
      <Link
        href={adminRoutes.wikiEntities}
        className="mb-6 inline-flex items-center text-sm text-cp-muted hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Wiki database
      </Link>
      <WikiEntityWizard sportSlug={context.sportSlug} mode="create" />
    </AdminShell>
  );
}
