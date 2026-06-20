import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { WikiEntityWizard } from "@/components/admin/wiki/wiki-entity-wizard";
import { requireWikiManagementAccess } from "@/lib/admin/session";
import { parseEntityIdParam } from "@/lib/domain/uuid";
import { getWikiEntityById } from "@/lib/wiki/service";
import {
  assertAdminCanManageWikiEntity,
  getWikiEntityAdminAccessRow,
} from "@/lib/wiki/admin-entity-access";
import { adminRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "Edit Wiki Entity",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditWikiEntityPage({ params }: PageProps) {
  const context = await requireWikiManagementAccess();
  const { id } = await params;
  let entityId: string;
  try {
    entityId = parseEntityIdParam(id, "entity id");
  } catch {
    notFound();
  }

  const entity = await getWikiEntityById(entityId);
  if (!entity || entity.sportId !== context.sportId) notFound();

  const access = await getWikiEntityAdminAccessRow(entityId);
  if (!access) notFound();
  try {
    assertAdminCanManageWikiEntity(access, context.userId, context.sportId);
  } catch {
    notFound();
  }

  return (
    <AdminShell context={context} title={`Edit — ${entity.displayName}`}>
      <Link
        href={adminRoutes.wikiEntities}
        className="mb-6 inline-flex items-center text-sm text-cp-muted hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Wiki database
      </Link>
      <WikiEntityWizard
        sportSlug={context.sportSlug}
        mode="edit"
        entityId={entityId}
        initial={entity}
      />
    </AdminShell>
  );
}
