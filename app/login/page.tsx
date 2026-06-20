import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { PageShell } from "@/components/layout/page-shell";
import { getUserAccountStatusById } from "@/lib/auth/account-status";
import { authRoutes } from "@/lib/constants/routes";
import {
  getServerSession,
  redirectIfAuthenticated,
  signOutCurrentSession,
} from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign In",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  const session = await getServerSession();
  if (session?.user) {
    const account = await getUserAccountStatusById(session.user.id);
    if (!account) {
      await signOutCurrentSession();
    } else if (!account.isActive) {
      await signOutCurrentSession();
      redirect(`${authRoutes.login}?error=account_inactive`);
    }
  }

  await redirectIfAuthenticated(callbackUrl);

  return (
    <PageShell
      showGridBackground={false}
      showFooter={false}
      showNavbar={false}
      mainClassName="min-h-0 flex-1"
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PageShell>
  );
}
