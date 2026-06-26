import { WikiEntitiesPage } from "@/components/admin/wiki/wiki-entities-page";
import { requireWikiManagementAccess } from "@/lib/admin/session";

export const metadata = {
  title: "Wiki Entities",
};

export default async function AdminWikiEntitiesPage() {
  const context = await requireWikiManagementAccess();
  return <WikiEntitiesPage context={context} />;
}
