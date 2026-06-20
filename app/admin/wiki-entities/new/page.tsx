import { AdminShell } from "@/components/admin/layout/admin-shell";
import { CreateEntityFlow } from "@/components/admin/wiki/create-entity-flow";
import { requireWikiManagementAccess } from "@/lib/admin/session";

export const metadata = {
  title: "Create Wiki Entity",
};

export default async function NewWikiEntityPage() {
  const context = await requireWikiManagementAccess();

  return (
    <AdminShell context={context} title="Create New Wiki Entity">
      <CreateEntityFlow sportSlug={context.sportSlug} />
    </AdminShell>
  );
}
