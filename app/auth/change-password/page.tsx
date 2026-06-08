import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { ChangePasswordRequiredForm } from "@/components/auth/change-password-required-form";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { getDefaultDashboardUrl } from "@/lib/roles/route-access";
import { getUserRoleAssignments } from "@/lib/roles/sync";

export const metadata = {
  title: "Set new password",
};

export default async function ChangePasswordRequiredPage() {
  const session = await requireSession();

  const [dbUser] = await getDb()
    .select({ mustChangePassword: user.mustChangePassword })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!dbUser?.mustChangePassword) {
    const roles = await getUserRoleAssignments(session.user.id);
    redirect(getDefaultDashboardUrl(roles));
  }

  return (
    <PageShell showGridBackground={false} showFooter={false} showNavbar={false}>
      <ChangePasswordRequiredForm />
    </PageShell>
  );
}
